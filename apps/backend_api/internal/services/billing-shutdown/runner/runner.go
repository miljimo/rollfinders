package shutdown

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"rollfinders/internal/services/billing-shutdown/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/applicationautoscaling"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
	"github.com/aws/aws-sdk-go-v2/service/elasticloadbalancingv2"
	elbtypes "github.com/aws/aws-sdk-go-v2/service/elasticloadbalancingv2/types"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	rdstypes "github.com/aws/aws-sdk-go-v2/service/rds/types"
	"github.com/aws/smithy-go"
)

type Runner struct {
	cfg    config.Config
	logger *slog.Logger
	aas    *applicationautoscaling.Client
	ecs    *ecs.Client
	rds    *rds.Client
	elb    *elasticloadbalancingv2.Client
	ec2    *ec2.Client
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*Runner, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.AWSRegion))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	return &Runner{
		cfg:    cfg,
		logger: logger,
		aas:    applicationautoscaling.NewFromConfig(awsCfg),
		ecs:    ecs.NewFromConfig(awsCfg),
		rds:    rds.NewFromConfig(awsCfg),
		elb:    elasticloadbalancingv2.NewFromConfig(awsCfg),
		ec2:    ec2.NewFromConfig(awsCfg),
	}, nil
}

func (r *Runner) Run(ctx context.Context) error {
	r.logger.Info("billing threshold shutdown started",
		"environment", r.cfg.TargetEnvironment,
		"threshold_gbp", r.cfg.BillingThresholdGBP,
		"billing_period", r.cfg.BillingPeriod,
		"dry_run", r.cfg.DryRun,
	)

	steps := []struct {
		name string
		fn   func(context.Context) error
	}{
		{"set_ecs_autoscaling_zero", r.setECSAutoscalingZero},
		{"set_ecs_desired_zero", r.setECSDesiredZero},
		{"wait_for_ecs_drained", r.waitForECSDrained},
		{"snapshot_rds", r.snapshotRDS},
		{"stop_rds", r.stopRDS},
		{"delete_alb", r.deleteALB},
		{"delete_nat_gateway_and_eip", r.deleteNATGatewayAndEIP},
	}

	for _, step := range steps {
		r.logger.Info("shutdown step started", "step", step.name)
		if err := step.fn(ctx); err != nil {
			r.logger.Error("shutdown step failed", "step", step.name, "error", err)
			return err
		}
		r.logger.Info("shutdown step completed", "step", step.name)
	}

	r.logger.Info("billing threshold shutdown completed")
	return nil
}

func (r *Runner) setECSAutoscalingZero(ctx context.Context) error {
	resourceID := "service/" + r.cfg.ECSCluster + "/" + r.cfg.ECSService
	if r.cfg.DryRun {
		r.logger.Info("dry run: would set ecs autoscaling target to zero", "resource_id", resourceID)
		return nil
	}
	_, err := r.aas.RegisterScalableTarget(ctx, &applicationautoscaling.RegisterScalableTargetInput{
		ServiceNamespace:  "ecs",
		ResourceId:        aws.String(resourceID),
		ScalableDimension: "ecs:service:DesiredCount",
		MinCapacity:       aws.Int32(0),
		MaxCapacity:       aws.Int32(0),
	})
	return err
}

func (r *Runner) setECSDesiredZero(ctx context.Context) error {
	if r.cfg.DryRun {
		r.logger.Info("dry run: would set ecs desired count to zero", "cluster", r.cfg.ECSCluster, "service", r.cfg.ECSService)
		return nil
	}
	_, err := r.ecs.UpdateService(ctx, &ecs.UpdateServiceInput{
		Cluster:      aws.String(r.cfg.ECSCluster),
		Service:      aws.String(r.cfg.ECSService),
		DesiredCount: aws.Int32(0),
	})
	return err
}

func (r *Runner) waitForECSDrained(ctx context.Context) error {
	if r.cfg.DryRun {
		r.logger.Info("dry run: would wait for ecs running count to reach zero")
		return nil
	}
	return r.poll(ctx, "ecs_drained", func(ctx context.Context) (bool, error) {
		out, err := r.ecs.DescribeServices(ctx, &ecs.DescribeServicesInput{
			Cluster:  aws.String(r.cfg.ECSCluster),
			Services: []string{r.cfg.ECSService},
		})
		if err != nil {
			return false, err
		}
		if len(out.Services) == 0 {
			return false, fmt.Errorf("ecs service %s/%s not found", r.cfg.ECSCluster, r.cfg.ECSService)
		}
		service := out.Services[0]
		r.logger.Info("ecs service status", "desired", service.DesiredCount, "running", service.RunningCount, "pending", service.PendingCount)
		return service.RunningCount == 0 && service.PendingCount == 0, nil
	})
}

func (r *Runner) snapshotRDS(ctx context.Context) error {
	instance, err := r.describeRDS(ctx)
	if err != nil {
		return err
	}
	status := aws.ToString(instance.DBInstanceStatus)
	if status == "stopped" {
		r.logger.Info("rds already stopped; skipping new snapshot", "db_instance", r.cfg.RDSInstanceID)
		return nil
	}
	if status != "available" {
		return fmt.Errorf("rds instance %s is %s, expected available or stopped", r.cfg.RDSInstanceID, status)
	}

	snapshotID := fmt.Sprintf("%s-%s", r.cfg.SnapshotPrefix, time.Now().UTC().Format("20060102150405"))
	if r.cfg.DryRun {
		r.logger.Info("dry run: would create rds snapshot", "db_instance", r.cfg.RDSInstanceID, "snapshot", snapshotID)
		return nil
	}
	_, err = r.rds.CreateDBSnapshot(ctx, &rds.CreateDBSnapshotInput{
		DBInstanceIdentifier: aws.String(r.cfg.RDSInstanceID),
		DBSnapshotIdentifier: aws.String(snapshotID),
	})
	if err != nil {
		return err
	}
	r.logger.Info("rds snapshot requested", "snapshot", snapshotID)

	return r.poll(ctx, "rds_snapshot_available", func(ctx context.Context) (bool, error) {
		out, err := r.rds.DescribeDBSnapshots(ctx, &rds.DescribeDBSnapshotsInput{
			DBSnapshotIdentifier: aws.String(snapshotID),
		})
		if err != nil {
			return false, err
		}
		if len(out.DBSnapshots) == 0 {
			return false, fmt.Errorf("snapshot %s not found", snapshotID)
		}
		status := aws.ToString(out.DBSnapshots[0].Status)
		r.logger.Info("rds snapshot status", "snapshot", snapshotID, "status", status)
		return status == "available", nil
	})
}

func (r *Runner) stopRDS(ctx context.Context) error {
	instance, err := r.describeRDS(ctx)
	if err != nil {
		return err
	}
	status := aws.ToString(instance.DBInstanceStatus)
	if status == "stopped" {
		r.logger.Info("rds already stopped", "db_instance", r.cfg.RDSInstanceID)
		return nil
	}
	if status != "available" {
		return fmt.Errorf("rds instance %s is %s, expected available or stopped", r.cfg.RDSInstanceID, status)
	}
	if r.cfg.DryRun {
		r.logger.Info("dry run: would stop rds", "db_instance", r.cfg.RDSInstanceID)
		return nil
	}
	_, err = r.rds.StopDBInstance(ctx, &rds.StopDBInstanceInput{
		DBInstanceIdentifier: aws.String(r.cfg.RDSInstanceID),
	})
	if err != nil {
		return err
	}

	return r.poll(ctx, "rds_stopped", func(ctx context.Context) (bool, error) {
		instance, err := r.describeRDS(ctx)
		if err != nil {
			return false, err
		}
		status := aws.ToString(instance.DBInstanceStatus)
		r.logger.Info("rds status", "db_instance", r.cfg.RDSInstanceID, "status", status)
		return status == "stopped", nil
	})
}

func (r *Runner) deleteALB(ctx context.Context) error {
	alb, err := r.describeALB(ctx)
	if err != nil {
		if isELBNotFound(err) {
			r.logger.Info("alb already absent", "alb", r.cfg.ALBName)
			return nil
		}
		return err
	}
	if r.cfg.DryRun {
		r.logger.Info("dry run: would delete alb", "alb", r.cfg.ALBName, "arn", aws.ToString(alb.LoadBalancerArn))
		return nil
	}
	_, err = r.elb.DeleteLoadBalancer(ctx, &elasticloadbalancingv2.DeleteLoadBalancerInput{
		LoadBalancerArn: alb.LoadBalancerArn,
	})
	if err != nil && !isELBNotFound(err) {
		return err
	}
	return nil
}

func (r *Runner) deleteNATGatewayAndEIP(ctx context.Context) error {
	nat, err := r.findNATGateway(ctx)
	if err != nil {
		return err
	}
	if nat == nil {
		r.logger.Info("nat gateway already absent", "nat_gateway", r.cfg.NATGatewayName)
		return nil
	}
	natID := aws.ToString(nat.NatGatewayId)
	allocationID := ""
	if len(nat.NatGatewayAddresses) > 0 {
		allocationID = aws.ToString(nat.NatGatewayAddresses[0].AllocationId)
	}
	if r.cfg.DryRun {
		r.logger.Info("dry run: would delete nat gateway and release eip", "nat_gateway", natID, "allocation_id", allocationID)
		return nil
	}
	if nat.State != types.NatGatewayStateDeleted && nat.State != types.NatGatewayStateDeleting {
		_, err = r.ec2.DeleteNatGateway(ctx, &ec2.DeleteNatGatewayInput{NatGatewayId: aws.String(natID)})
		if err != nil {
			return err
		}
	}
	err = r.poll(ctx, "nat_gateway_deleted", func(ctx context.Context) (bool, error) {
		current, err := r.findNATGatewayByID(ctx, natID)
		if err != nil {
			return false, err
		}
		if current == nil {
			return true, nil
		}
		r.logger.Info("nat gateway status", "nat_gateway", natID, "status", current.State)
		return current.State == types.NatGatewayStateDeleted, nil
	})
	if err != nil {
		return err
	}
	if allocationID == "" {
		return nil
	}
	_, err = r.ec2.ReleaseAddress(ctx, &ec2.ReleaseAddressInput{AllocationId: aws.String(allocationID)})
	if err != nil {
		if isAPIError(err, "InvalidAllocationID.NotFound") {
			return nil
		}
		return err
	}
	r.logger.Info("released nat elastic ip", "allocation_id", allocationID)
	return nil
}

func (r *Runner) describeRDS(ctx context.Context) (rdstypes.DBInstance, error) {
	out, err := r.rds.DescribeDBInstances(ctx, &rds.DescribeDBInstancesInput{
		DBInstanceIdentifier: aws.String(r.cfg.RDSInstanceID),
	})
	if err != nil {
		return rdstypes.DBInstance{}, err
	}
	if len(out.DBInstances) == 0 {
		return rdstypes.DBInstance{}, fmt.Errorf("rds instance %s not found", r.cfg.RDSInstanceID)
	}
	return out.DBInstances[0], nil
}

func (r *Runner) describeALB(ctx context.Context) (elbtypes.LoadBalancer, error) {
	out, err := r.elb.DescribeLoadBalancers(ctx, &elasticloadbalancingv2.DescribeLoadBalancersInput{
		Names: []string{r.cfg.ALBName},
	})
	if err != nil {
		return elbtypes.LoadBalancer{}, err
	}
	if len(out.LoadBalancers) == 0 {
		return elbtypes.LoadBalancer{}, fmt.Errorf("alb %s not found", r.cfg.ALBName)
	}
	return out.LoadBalancers[0], nil
}

func (r *Runner) findNATGateway(ctx context.Context) (*types.NatGateway, error) {
	out, err := r.ec2.DescribeNatGateways(ctx, &ec2.DescribeNatGatewaysInput{
		Filter: []types.Filter{
			{Name: aws.String("tag:Name"), Values: []string{r.cfg.NATGatewayName}},
			{Name: aws.String("state"), Values: []string{"pending", "available", "deleting", "deleted", "failed"}},
		},
	})
	if err != nil {
		return nil, err
	}
	if len(out.NatGateways) == 0 {
		return nil, nil
	}
	return &out.NatGateways[0], nil
}

func (r *Runner) findNATGatewayByID(ctx context.Context, natID string) (*types.NatGateway, error) {
	out, err := r.ec2.DescribeNatGateways(ctx, &ec2.DescribeNatGatewaysInput{
		NatGatewayIds: []string{natID},
	})
	if err != nil {
		return nil, err
	}
	if len(out.NatGateways) == 0 {
		return nil, nil
	}
	return &out.NatGateways[0], nil
}

func (r *Runner) poll(ctx context.Context, name string, ready func(context.Context) (bool, error)) error {
	deadline, cancel := context.WithTimeout(ctx, r.cfg.Timeout)
	defer cancel()
	ticker := time.NewTicker(r.cfg.PollInterval)
	defer ticker.Stop()

	for {
		done, err := ready(deadline)
		if err != nil {
			return err
		}
		if done {
			return nil
		}
		select {
		case <-deadline.Done():
			return fmt.Errorf("timed out waiting for %s: %w", name, deadline.Err())
		case <-ticker.C:
		}
	}
}

func isELBNotFound(err error) bool {
	var notFound *elbtypes.LoadBalancerNotFoundException
	return errors.As(err, &notFound)
}

func isAPIError(err error, code string) bool {
	var apiErr smithy.APIError
	return errors.As(err, &apiErr) && apiErr.ErrorCode() == code
}
