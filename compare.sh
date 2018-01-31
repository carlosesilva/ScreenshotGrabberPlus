#!/bin/bash

# Make sure the required programs are installed
command -v identify >/dev/null 2>&1 || { echo "I require 'identify' but it's not installed.  Aborting." >&2; exit 1; }
command -v compare >/dev/null 2>&1 || { echo "I require 'compare' but it's not installed.  Aborting." >&2; exit 1; }
command -v convert >/dev/null 2>&1 || { echo "I require 'convert' but it's not installed.  Aborting." >&2; exit 1; }

# Compares screenhots
comparescreenshots() {
  first=$1
  second=$2
  differences=$3
  encoded=$4

  # Check both screenshot files exist.
  if [ ! -f "$first/$encoded/screenshot.png" ]; then
    echo "[!] No screenshot found in $first/$encoded/screenshot.png."
    return 1
  fi
  firstscreenshot=$first/$encoded/screenshot.png

  if [ ! -d "$second/$encoded" ]; then
    echo "[!] No matching directory in $second/$encoded for $first/$encoded."
    return 1
  fi

  if [ ! -f "$second/$encoded/screenshot.png" ]; then
    echo "[!] No screenshot found in $second/$encoded/screenshot.png."
    return 1
  fi
  secondscreenshot=$second/$encoded/screenshot.png

  # Get screenshot dimensions
  firstsize=$(identify -ping -format '%w%h' "$firstscreenshot")
  secondsize=$(identify -ping -format '%w%h' "$secondscreenshot")

  # Compare dimensions
  if [ "$firstsize" -eq "$secondsize" ];
  then
    # The dimensions matched, compare the screenshots 
    compare "$firstscreenshot" "$secondscreenshot" -metric AE "$differences/$encoded/screenshot.png"  > /dev/null 2>&1

    # If the compare command above exited with a 0
    if [ $? -eq 0 ]; then
        # clean up since the screenshots are identical
        rm "$differences/$encoded/screenshot.png"
      # else
        # the screenshot is not identical meaning something has changed on the page.
        # echo "$encoded does not match"
    fi
  else
    # The dimensions didn't match, just add the images side by side to show the difference in height.
    convert "$firstscreenshot" "$secondscreenshot" +append "$differences/$encoded/screenshot.png"
    # echo "$encoded is a different height"
  fi
}

# Compares the console messages/errors
diffconsole() {
  first=$1
  second=$2
  differences=$3
  encoded=$4

  differencefile=$differences/$encoded/console.diff

  # Diff the text files in both directories
  diff -Nau --exclude='*.png' $first/$encoded $second/$encoded > $differencefile

  # If the diff file is empty, remove it.
  if [ ! -s $differencefile ]
  then
    rm $differencefile
  fi
}

# Check the correct number of arguments were passed in
if [ "$#" -ne 2 ]
then
  printf "Usage: `basename %s` {first directory} {second directory}\n" $0
  printf "Compares the screenshots in the first directory to those in "
  printf "the second.\n"
  exit 1
fi

# Rename the arguments
firstarg="$1"
secondarg="$2"

# Check the passed in directories exist 
if [ ! -d "$firstarg" ]; then
  printf "'%s' does not exist\n" $first
  exit 1
fi

if [ ! -d "$secondarg" ]; then
  printf "'%s' does not exist\n" $second
  exit 1
fi

# Get the full path to each directory
first=$(cd -P -- "$1" && printf "%s\n" "$(pwd -P)")
second=$(cd -P -- "$2" && printf "%s\n" "$(pwd -P)")

# Create the difference directory
differences=$(printf "%s/%s-vs-%s" "$(dirname -- "$first")" \
  "$(basename -- "$first")" "$(basename -- "$second")")

if [ ! -d "$differences" ]; then
  printf "Creating '%s' to store difference images\n" $differences
  mkdir $differences
fi

# Loop through each url directory
for urlpath in $(find $first -type d -maxdepth 1 -mindepth 1) ; do
  # Get the encoded url from urlpath
  encoded=$(basename -- $urlpath)

  # find a way to decode the encoded
  # decodedurl=urldecode($encoded)

  # Create a url directory in the difference directory
  if [ ! -d "$differences/$encoded" ]; then
    mkdir $differences/$encoded
  fi

  # Compare the screenhots for this url
  comparescreenshots $first $second $differences $encoded

  # Compare the console messages/errors for this url
  diffconsole $first $second $differences $encoded

  # Remove url directory from difference directory if it is empty
  if [ ! "$(ls -A $differences/$encoded)" ]
  then
    rmdir $differences/$encoded
  fi

done

# Display results.
if [ "$(ls -A $differences)" ]
then
  echo 'We have found some differences. See the full report at:'
  echo $differences
  exit 1
else
  echo 'There were no differences.'
fi
