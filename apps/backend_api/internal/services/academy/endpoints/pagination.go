package endpoints

type paginationMeta struct {
	Limit      int  `json:"limit"`
	Offset     int  `json:"offset"`
	Count      int  `json:"count"`
	HasMore    bool `json:"has_more"`
	NextOffset *int `json:"next_offset,omitempty"`
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
