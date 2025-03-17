#!/bin/bash
set -e

# Check if kubeseal is installed
if ! command -v kubeseal &> /dev/null; then
    echo "kubeseal is not installed. Please install it first."
    echo "On macOS: brew install kubeseal"
    echo "On Linux: follow installation instructions from the kubeseal documentation"
    exit 1
fi

# Define environments
ENVIRONMENTS=("preprod" "production")

# Create sealed secrets for all environments
for env in "${ENVIRONMENTS[@]}"; do
    echo "Creating sealed secret for $env environment..."
    
    # Define file names
    input_file="payflow-${env}-secrets.yaml"
    output_file="sealed-payflow-${env}-secrets.yaml"
    
    # Check if input file exists
    if [ ! -f "$input_file" ]; then
        echo "Error: Input file $input_file does not exist."
        echo "Please create it first or check the file path."
        continue
    fi
    
    # Create sealed secret
    kubeseal --format yaml --scope namespace-wide < "$input_file" > "$output_file"
    
    echo "✅ Sealed secret created: $output_file"
done
