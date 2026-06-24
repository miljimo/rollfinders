package environments

import platform "rollfinders/internal/core/environments"

type VariableNotFoundError = platform.VariableNotFoundError
type Environment = platform.Environment

var New = platform.New
var Keys = platform.Keys
var FromString = platform.FromString
