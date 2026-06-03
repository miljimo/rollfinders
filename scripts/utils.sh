#!/bin/bash

export SUCCESS=0
export FAILURE=1


function command_exists(){
    local command_name="$1"
    if [ -e "$command_name" ] ; then
        return $SUCCESS
    fi
    return $FAILURE

}

function file_exists(){
    local filename="$1"

    if [ -f $filename ] ; then
        return $SUCCESS
    fi
    return $FAILURE
}


function folder_exists(){
    # function check if the folder exists(TESTED)
    local foldername="$1"
    if [ -d "$foldername" ] ; then
        return $SUCCESS
    fi
    return $FAILURE
}