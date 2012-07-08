#!/bin/bash - 
#===============================================================================
#
#         USAGE:  ./build.sh 
# 
#   DESCRIPTION:  Compile source file into the actual node module
# 
#        AUTHOR: Rickey Visinski 
#      REVISION:  0.0.2
#===============================================================================

set -o nounset                              # Treat unset variables as an error

BIN=bin/shpaml.js
LIB=lib/shpaml.js

echo '#!/usr/bin/env node' > $BIN

# I use the closure compiler, this is the quick and dirty check if you build from source
if [[ $(which closure) ]] ; then
    closure --compilation_level SIMPLE_OPTIMIZATIONS --js src/shpaml.js --js_output_file $LIB || exit 1
    closure --compilation_level SIMPLE_OPTIMIZATIONS --js src/run-shpaml.js >> $BIN || exit 1
else
    cat src/shpaml.js > $LIB
    cat src/run-shpaml.js >> $BIN
fi

chmod +x $BIN
