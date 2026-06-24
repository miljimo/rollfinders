package server

type metrics struct {
	requests         int64
	payments         int64
	refunds          int64
	webhooks         int64
	providerSuccess  int64
	providerFailure  int64
	outboxDispatched int64
}
