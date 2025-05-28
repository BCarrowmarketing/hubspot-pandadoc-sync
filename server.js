// HubSpot to PandaDoc Webhook Server for Render
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration from environment variables ONLY (no hardcoded keys)
const CONFIG = {
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN
  },
  pandadoc: {
    apiKey: process.env.PANDADOC_API_KEY,
    baseUrl: 'https://api.pandadoc.com/public/v1'
  },
  port: process.env.PORT || 10000
};

// Check for required environment variables
if (!CONFIG.hubspot.accessToken) {
  console.error('❌ HUBSPOT_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

if (!CONFIG.pandadoc.apiKey) {
  console.error('❌ PANDADOC_API_KEY environment variable is required');
  process.exit(1);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 HubSpot to PandaDoc Webhook Server is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main webhook endpoint
app.post('/hubspot-webhook', async (req, res) => {
  try {
    console.log('📥 Webhook received at:', new Date().toISOString());
    console.log('📄 Payload:', JSON.stringify(req.body, null, 2));
    
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let processedCount = 0;
    
    for (const event of events) {
      if (event.subscriptionType === 'contact.creation' || 
          event.subscriptionType === 'contact.propertyChange') {
        
        console.log(`🔄 Processing ${event.subscriptionType} for contact ID: ${event.objectId}`);
        
        const contactData = await getHubSpotContact(event.objectId);
        
        if (contactData) {
          await createOrUpdatePandaDocContact(contactData);
          processedCount++;
        }
      }
    }
    
    console.log(`✅ Processed ${processedCount} contacts successfully`);
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      processedEvents: processedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get contact from HubSpot with company data
async function getHubSpotContact(contactId) {
  try {
    console.log(`📞 Fetching contact ${contactId}...`);
    
    const contactResponse = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.hubspot.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: 'firstname,lastname,email,phone,company,jobtitle,address,city,state,zip,country',
          associations: 'companies'
        }
      }
    );
    
    const contact = contactResponse.data;
    
    // Get associated company if exists
    const companyAssociations = contact.associations?.companies?.results;
    if (companyAssociations && companyAssociations.length > 0) {
      const companyId = companyAssociations[0].id;
      console.log(`🏢 Fetching company ${companyId}...`);
      
      const companyResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.hubspot.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            properties: 'name,domain,phone,address,city,state,zip,country,industry,description,website'
          }
        }
      );
      
      contact.associatedCompany = companyResponse.data;
    }
    
    return contact;
  } catch (error) {
    console.error(`❌ Error fetching contact ${contactId}:`, error.response?.data || error.message);
    return null;
  }
}

// Create contact in PandaDoc
async function createOrUpdatePandaDocContact(hubspotContact) {
  try {
    const properties = hubspotContact.properties || {};
    const companyData = hubspotContact.associatedCompany?.properties || {};
    
    const pandadocContact = {
      email: properties.email,
      first_name: properties.firstname || '',
      last_name: properties.lastname || '',
      company: companyData.name || properties.company || '',
      job_title: properties.jobtitle || '',
      phone: properties.phone || companyData.phone || '',
      state: properties.state || companyData.state || '',
      street_address: properties.address || companyData.address || '',
      city: properties.city || companyData.city || '',
      postal_code: properties.zip || companyData.zip || '',
      country: properties.country || companyData.country || ''
    };
    
    // Remove empty fields
    Object.keys(pandadocContact).forEach(key => {
      if (!pandadocContact[key]) {
        delete pandadocContact[key];
      }
    });
    
    if (!pandadocContact.email) {
      console.warn(`⚠️ Skipping contact - no email`);
      return;
    }
    
    console.log(`📤 Creating contact: ${pandadocContact.email}`);
    if (companyData.name) {
      console.log(`   🏢 Company: ${companyData.name}`);
    }
    
    const response = await axios.post(
      `${CONFIG.pandadoc.baseUrl}/contacts`,
      pandadocContact,
      {
        headers: {
          'Authorization': `API-Key ${CONFIG.pandadoc.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Contact synced: ${pandadocContact.email}`);
    return response.data;
    
  } catch (error) {
    if (error.response?.status === 400 && 
        error.response?.data?.detail?.includes('already exists')) {
      console.log(`ℹ️ Contact already exists: ${pandadocContact.email}`);
    } else {
      console.error('❌ PandaDoc error:', error.response?.data || error.message);
    }
  }
}

// Start server
app.listen(CONFIG.port, () => {
  console.log(`🚀 Server running on port ${CONFIG.port}`);
  console.log(`🔍 Health check: http://localhost:${CONFIG.port}/`);
  console.log(`📡 Webhook URL: /hubspot-webhook`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down gracefully...');
  process.exit(0);
});
