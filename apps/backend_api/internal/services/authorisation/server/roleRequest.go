package server

type roleRequest struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Level       int    `json:"level"`
	Assignable  *bool  `json:"assignable"`
	SystemRole  bool   `json:"system_role"`
}

func roleFromRequest(id string, req roleRequest) (Role, bool) {
	key := cleanString(req.Key)
	name := cleanString(req.Name)
	if key == "" || name == "" {
		return Role{}, false
	}
	level := req.Level
	if level == 0 {
		level = 100
	}
	assignable := true
	if req.Assignable != nil {
		assignable = *req.Assignable
	}
	return Role{ID: id, Key: key, Name: name, Description: cleanString(req.Description), Level: level, Assignable: assignable, SystemRole: req.SystemRole}, true
}
