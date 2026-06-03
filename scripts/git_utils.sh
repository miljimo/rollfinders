#!/bin/bash
chmod +x ./scripts/utils.sh &&  . ./scripts/utils.sh

export GIT_CXX=git


function git_exists(){
    command_exists $GIT_CXX
    return "$?"
}


function get_branch_name() {
    # Check if the current directory is a Git repository
    if ! $GIT_CXX rev-parse --git-dir &>/dev/null; then
        echo "Not a Git repository."
        return 1
    fi

    # Get the current branch name
    branch_name=$($GIT_CXX symbolic-ref --short HEAD 2>/dev/null)

    # If not on a branch, check if in a detached state
    if [ -z "$branch_name" ]; then
        branch_name=$($GIT_CXX describe --tags --exact-match 2>/dev/null)
    fi

    echo "$branch_name"
}