package handlers

type MiddlewareFunc func(HttpHandler) HttpHandler

type Middleware struct {
	handler HttpHandler
}

func WithMiddleware(handler HttpHandler) *Middleware {
	return &Middleware{handler: handler}
}

func (m *Middleware) Apply(middlewares ...MiddlewareFunc) HttpHandler {
	for _, middleware := range middlewares {
		handler := middleware(m.handler)
		if handler == nil {
			panic("middleware must return a valid handler")
		}
		m.handler = handler
	}
	return m.handler
}
