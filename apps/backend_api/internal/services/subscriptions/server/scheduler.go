package server

import (
	"context"
	"time"
)

func (s *server) startSchedulers(ctx context.Context) {
	if s.repo == nil || s.cfg.DowngradeSchedulerInterval <= 0 {
		return
	}
	go s.runDowngradeScheduler(ctx, s.cfg.DowngradeSchedulerInterval)
}

func (s *server) runDowngradeScheduler(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	s.applyDueDowngradesFromScheduler(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.applyDueDowngradesFromScheduler(ctx)
		}
	}
}

func (s *server) applyDueDowngradesFromScheduler(ctx context.Context) {
	applied, _, err := s.repo.applyDueScheduledDowngrades(ctx, time.Now().UTC(), 100)
	if err != nil {
		s.logger.Error("scheduled downgrade apply failed", "error", err)
		return
	}
	if len(applied) > 0 {
		s.logger.Info("scheduled downgrades applied", "count", len(applied))
	}
}
