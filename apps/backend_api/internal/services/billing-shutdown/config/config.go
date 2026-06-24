package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AWSRegion           string
	TargetEnvironment   string
	ProjectName         string
	RequireApproval     bool
	Approved            bool
	DryRun              bool
	BillingThresholdGBP string
	BillingPeriod       string
	AccountID           string
	ECSCluster          string
	ECSService          string
	RDSInstanceID       string
	ALBName             string
	NATGatewayName      string
	SnapshotPrefix      string
	Timeout             time.Duration
	PollInterval        time.Duration
}

func Load() (Config, error) {
	projectName := env("PROJECT_NAME", "rollfinder")
	targetEnvironment := env("TARGET_ENVIRONMENT", env("ENVIRONMENT", "production"))
	namePrefix := projectName + "-" + targetEnvironment

	cfg := Config{
		AWSRegion:           env("AWS_REGION", "eu-west-2"),
		TargetEnvironment:   targetEnvironment,
		ProjectName:         projectName,
		RequireApproval:     envBool("REQUIRE_APPROVAL", true),
		Approved:            envBool("COST_SHUTDOWN_APPROVED", false) || strings.EqualFold(os.Getenv("APPROVAL_STATE"), "approved"),
		DryRun:              envBool("DRY_RUN", true),
		BillingThresholdGBP: env("BILLING_THRESHOLD_GBP", "35"),
		BillingPeriod:       env("BILLING_PERIOD", ""),
		AccountID:           env("AWS_ACCOUNT_ID", ""),
		ECSCluster:          env("ECS_CLUSTER", namePrefix),
		ECSService:          env("ECS_SERVICE", "web"),
		RDSInstanceID:       env("RDS_INSTANCE_ID", namePrefix+"-postgres"),
		ALBName:             env("ALB_NAME", namePrefix+"-alb"),
		NATGatewayName:      env("NAT_GATEWAY_NAME", namePrefix+"-nat"),
		SnapshotPrefix:      env("SNAPSHOT_PREFIX", namePrefix+"-postgres-pre-shutdown"),
		Timeout:             envDuration("TIMEOUT", 45*time.Minute),
		PollInterval:        envDuration("POLL_INTERVAL", 15*time.Second),
	}

	if cfg.TargetEnvironment != "production" {
		return Config{}, fmt.Errorf("refusing to run for target environment %q", cfg.TargetEnvironment)
	}
	if cfg.AWSRegion == "" {
		return Config{}, fmt.Errorf("AWS_REGION is required")
	}
	if cfg.RequireApproval && !cfg.Approved {
		return Config{}, fmt.Errorf("production cost shutdown requires COST_SHUTDOWN_APPROVED=true or APPROVAL_STATE=approved")
	}

	return cfg, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
