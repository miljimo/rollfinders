package server

type paginationMeta struct {
	Limit      int  `json:"limit"`
	Offset     int  `json:"offset"`
	Count      int  `json:"count"`
	HasMore    bool `json:"has_more"`
	NextOffset *int `json:"next_offset,omitempty"`
	Page       int  `json:"page,omitempty"`
	PageSize   int  `json:"page_size,omitempty"`
	TotalItems *int `json:"total_items,omitempty"`
	TotalPages *int `json:"total_pages,omitempty"`
	NextPage   *int `json:"next_page,omitempty"`
}

func pagination(limit int, offset int, count int) paginationMeta {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	meta := paginationMeta{Limit: limit, Offset: offset, Count: count, HasMore: count >= limit}
	if meta.HasMore {
		nextOffset := offset + count
		meta.NextOffset = &nextOffset
	}
	return meta
}

func pagePagination(page int, pageSize int, count int, totalItems int, totalPages int) paginationMeta {
	meta := pagination(pageSize, (page-1)*pageSize, count)
	meta.Page = page
	meta.PageSize = pageSize
	totalItemsValue := totalItems
	totalPagesValue := totalPages
	meta.TotalItems = &totalItemsValue
	meta.TotalPages = &totalPagesValue
	meta.HasMore = page < totalPages
	if meta.HasMore {
		nextPage := page + 1
		nextOffset := meta.Offset + count
		meta.NextPage = &nextPage
		meta.NextOffset = &nextOffset
	}
	return meta
}
