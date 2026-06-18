package environments

import (
	"os"
	"strings"
	"testing"
)

func Test_That_WhenEnvironment_VariableIsCreatedItsSuccess(t *testing.T) {

	environ := New()
	paths := environ.Get("PATH")

	if (strings.Trim(paths, " ")) == "" {
		t.Error("Failed, Path not found")
	}
}

func Test_WhenEnvironmentVariableIsCreatedAndGivenValueThatDoesNotExistsEmptyStringShouldBeReturned(t *testing.T) {
	environ := New()
	val := environ.Get("SOME_THINK")
	if val != "" {
		t.Errorf("Failed: Key=%s does exists", "SOME_THINK")
		return
	}
}

func Test_WhenLoadIsCalledWithAValidKeyActualValueShouldBeLoaded(t *testing.T) {
	environ := New()
	if err := environ.Load("PATH"); err != nil {
		t.Errorf("Failed : %s", err)
		return
	}

}

func Test_When_FromString_IsCalled_All_Environment_Keys_Should_Be_Presented_And_Loaded(t *testing.T) {
	environ := FromString("${PATH}")

	actual := environ.Get("PATH")
	expected := os.Getenv("PATH")

	if actual != expected {
		t.Error("Failed: unable to get Path from string")
		return
	}

}

func Test_When_Presents_IsCalled_And_OneOfTheKeysIsNotPresented_Then_ErrorShouldBeReturned(t *testing.T) {

	environ := New()
	environ.Set("PATH", "some value")
	environ.Set("SOME_THINK", "found")
	err := environ.Presents([]string{"PATH", "SOME_THINK"})
	if err != nil {
		t.Errorf("Failed: %s", err)
		return
	}
}
