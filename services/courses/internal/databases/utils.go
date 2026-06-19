package databases

import "context"

func New(ctx context.Context, name string, connString string) (DataContext, error) {
	return (&dataConnectionImpl{}).createDataContext(ctx, name, connString, nil)
}
