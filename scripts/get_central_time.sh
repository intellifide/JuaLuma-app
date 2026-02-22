#!/bin/bash
#
# Script to retrieve and display the current date and time in Central Time
#

echo "Current Central Time:"
TZ='America/Chicago' date '+%Y-%m-%d %H:%M:%S %Z (%A)' 