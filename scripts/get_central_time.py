#!/usr/bin/env python3
"""
Script to retrieve and display the current date and time in Central Time.
"""

from datetime import datetime
import pytz

def get_central_time():
    """Get the current date and time in Central Time zone."""
    # Define Central Time zone
    central_tz = pytz.timezone('US/Central')
    
    # Get current time in Central Time
    central_time = datetime.now(central_tz)
    
    return central_time

def main():
    """Main function to display Central Time."""
    try:
        current_time = get_central_time()
        
        # Format the time in a readable format
        formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S %Z")
        
        print(f"Current Central Time: {formatted_time}")
        
        # Also show day of week
        day_of_week = current_time.strftime("%A")
        print(f"Day of the week: {day_of_week}")
        
        return current_time
        
    except Exception as e:
        print(f"Error retrieving Central Time: {e}")
        return None

if __name__ == "__main__":
    main() 