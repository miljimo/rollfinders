package handlers

import (
	"net/http"

	platform "rollfinders/internal/core/handlers"
)

type Params = platform.Params
type HttpHandler = platform.HttpHandler
type MiddlewareFunc = platform.MiddlewareFunc
type Middleware = platform.Middleware
type Router = platform.Router
type Route = platform.Route
type StatusError = platform.StatusError
type PaginationMeta = platform.PaginationMeta

const DefaultPageSize = platform.DefaultPageSize

var DefaultRouter = platform.DefaultRouter
var Handle = platform.Handle
var Header = platform.Header
var Query = platform.Query
var IntQuery = platform.IntQuery
var PageLimit = platform.PageLimit
var PageOffset = platform.PageOffset
var Pagination = platform.Pagination
var PagePagination = platform.PagePagination
var Param = platform.Param
var RequestId = platform.RequestId
var NewStatusError = platform.NewStatusError
var ErrorWithStatus = platform.ErrorWithStatus
var WriteError = platform.WriteError
var WriteJSON = platform.WriteJSON
var WriteOK = platform.WriteOK
var WriteCreated = platform.WriteCreated
var WriteNoContent = platform.WriteNoContent
var Json = platform.Json
var BodyJSON = platform.BodyJSON
var SuccessWithData = platform.SuccessWithData
var Middlewares = platform.Middlewares
var Listen = platform.Listen
var EndPoint = platform.EndPoint
var WithMiddleware = platform.WithMiddleware

func Error(w http.ResponseWriter, err error) {
	ErrorWithStatus(w, err, http.StatusInternalServerError)
}
