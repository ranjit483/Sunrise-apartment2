/**
 * Script to approve user via REST API
 */

const PROJECT_ID = 'sunrise-appartmant';
const EMAIL = 'ranjitmanaraja@gmail.com';

async function approveUser() {
  // First, get all users to find the document ID
  const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

  const query = {
    structuredQuery: {
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: EMAIL }
        }
      }
    }
  };

  try {
    console.log('Searching for user...');
    
    const response = await fetch(listUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    const results = await response.json();
    
    if (!results || results.length === 0 || !results[0].document) {
      console.log('User not found');
      return;
    }

    const doc = results[0].document;
    const docId = doc.name.split('/').pop();
    const currentData = doc.fields || {};

    console.log('Found document ID:', docId);
    console.log('Current status:', currentData.status?.stringValue);

    // Update the document
    const updateUrl = `https://firestore.googleapis.com/v1/${doc.name}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ya29.a0AfH6SMBx...' // Need OAuth token
      },
      body: JSON.stringify({
        fields: {
          ...Object.fromEntries(
            Object.entries(currentData).map(([k, v]) => [k, v])
          ),
          status: { stringValue: 'approved' },
          approvedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    console.log('Update response:', updateResponse.status);

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nNote: You need OAuth2 authentication to use Firestore REST API.');
    console.log('Please either:');
    console.log('1. Use Firebase Console to manually approve the user');
    console.log('2. Set up a service account and use Firebase Admin SDK');
  }
}

approveUser();