# HubSpot to PandaDoc Contact Sync

Automatically sync contacts from HubSpot to PandaDoc via real-time webhooks.

## Features

- ✅ Real-time contact syncing via HubSpot webhooks
- ✅ Company data integration (name, industry, website, etc.)
- ✅ Automatic contact creation in PandaDoc
- ✅ Comprehensive logging and error handling

## Environment Variables

This application requires the following environment variables:

- `HUBSPOT_ACCESS_TOKEN` - Your HubSpot private app access token
- `PANDADOC_API_KEY` - Your PandaDoc API key
- `PORT` - Server port (defaults to 10000)

## Deployment

### Deploy to Render

1. Fork or clone this repository
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repository
4. Add environment variables in Render dashboard
5. Deploy

### Environment Variables Setup

In your Render dashboard, add:

```
HUBSPOT_ACCESS_TOKEN=your_hubspot_token_here
PANDADOC_API_KEY=your_pandadoc_key_here
```

## Webhook Registration

After deployment, register your webhooks with HubSpot:

```bash
curl -X POST "https://api.hubapi.com/webhooks/v3/subscriptions" \
  -H "Authorization: Bearer YOUR_HUBSPOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "contact.creation",
    "active": true,
    "webhookUrl": "https://your-app.onrender.com/hubspot-webhook"
  }'
```

## Endpoints

- `GET /` - Health check
- `POST /hubspot-webhook` - HubSpot webhook endpoint

## Local Development

```bash
npm install
HUBSPOT_ACCESS_TOKEN=your_token PANDADOC_API_KEY=your_key npm start
```

## Security

- API keys are stored as environment variables only
- No sensitive data is committed to repository
- Webhook signature verification can be enabled