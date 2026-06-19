package handlers

type MiddlewareFunc func(HttpHandler) HttpHandler

type Middleware struct {
	handler HttpHandler
}

func (m *Middleware) Apply(middlewares ...MiddlewareFunc) HttpHandler {
	for i := 0; i < len(middlewares); i++ {
		handler := middlewares[i](m.handler)
		if handler == nil {
			panic("middleware must return a valid handler")
		}
		m.handler = handler
	}
	return m.handler
}

func WithMiddleware(handler HttpHandler) *Middleware {
	return &Middleware{handler: handler}
}
