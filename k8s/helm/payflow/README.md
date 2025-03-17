# PayFlow Helm Chart

This Helm chart deploys the PayFlow NestJS application on Kubernetes with support for multiple environments.

## Prerequisites

- Kubernetes cluster
- Helm v3 installed
- kubectl configured to communicate with your cluster
- Docker images built and pushed to your container registry

## Chart Structure

```
payflow/
├── Chart.yaml             # Chart metadata
├── values.yaml            # Default values
├── values-preprod.yaml    # Pre-production specific values
├── values-production.yaml # Production specific values
└── templates/             # Kubernetes resource templates
    ├── _helpers.tpl       # Helper functions
    ├── deployment.yaml    # App deployment
    ├── service.yaml       # Service for the app
    ├── ingress.yaml       # Ingress for external access
    └── autoscaling.yaml   # Horizontal Pod Autoscaler
```

## Configuration

The chart is configured to deploy to two environments:

1. **Pre-production**:
   - Namespace: `payflow-preprod`
   - Domain: `payflow-preprod.lyrolab.fr/api`
   - Single replica deployment

2. **Production**:
   - Namespace: `payflow-production`
   - Domain: `payflow.lyrolab.fr/api`
   - Multiple replicas with autoscaling

## Environment Variables

All environment variables are stored in Kubernetes Sealed Secrets:
- The chart expects a secret named `payflow-env-secrets` in each namespace.
- Make sure to create these secrets before deploying the chart.

### Creating Sealed Secrets

We've provided templates and tools to help you create sealed secrets for your environments:

1. Navigate to the secrets directory:
   ```bash
   cd helm/payflow/secrets
   ```

2. Create and apply sealed secrets using the provided script:
   ```bash
   ./create-sealed-secrets.sh
   ```
   
3. Follow the prompts to create secrets for either preprod or production environments.

For more detailed instructions, see the README in the `secrets` directory.

## Deployment Instructions

### Initial Setup

1. Create the necessary namespaces:

```bash
kubectl create namespace payflow-preprod
kubectl create namespace payflow-production
```

2. Create the sealed secrets in both namespaces with your environment variables.

### Deploying to Pre-production

```bash
helm upgrade --install payflow ./helm/payflow \
  --namespace payflow-preprod \
  --values helm/payflow/values.yaml \
  --values helm/payflow/values-preprod.yaml \
  --set image.tag=YOUR_DOCKER_TAG
```

### Deploying to Production

```bash
helm upgrade --install payflow ./helm/payflow \
  --namespace payflow-production \
  --values helm/payflow/values.yaml \
  --values helm/payflow/values-production.yaml \
  --set image.tag=YOUR_DOCKER_TAG
```

### Example: Deploying a Specific Version

```bash
# Deploy version v1.0.0 to pre-production
helm upgrade --install payflow ./helm/payflow \
  --namespace payflow-preprod \
  --values helm/payflow/values.yaml \
  --values helm/payflow/values-preprod.yaml \
  --set image.tag=v1.0.0

# Deploy version v1.0.0 to production
helm upgrade --install payflow ./helm/payflow \
  --namespace payflow-production \
  --values helm/payflow/values.yaml \
  --values helm/payflow/values-production.yaml \
  --set image.tag=v1.0.0
```

## Removing the Deployment

```bash
# Uninstall from pre-production
helm uninstall payflow --namespace payflow-preprod

# Uninstall from production
helm uninstall payflow --namespace payflow-production
```

## Accessing the Application

Once deployed, the application will be available at:
- Pre-production: `https://payflow-preprod.lyrolab.fr/api`
- Production: `https://payflow.lyrolab.fr/api`

## Monitoring

Check the status of the deployment:

```bash
# For pre-production
kubectl get all -n payflow-preprod

# For production
kubectl get all -n payflow-production
```

View application logs:

```bash
# For pre-production
kubectl logs -l app.kubernetes.io/name=payflow -n payflow-preprod

# For production
kubectl logs -l app.kubernetes.io/name=payflow -n payflow-production
```

## Troubleshooting

If you encounter issues:

1. Check if pods are running:
   ```bash
   kubectl get pods -n <namespace>
   ```

2. Describe a pod to see events:
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   ```

3. Check logs for errors:
   ```bash
   kubectl logs <pod-name> -n <namespace>
   ```

4. Verify the ingress configuration:
   ```bash
   kubectl get ingress -n <namespace>
   kubectl describe ingress <ingress-name> -n <namespace>
   ``` 