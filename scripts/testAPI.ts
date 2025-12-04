import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const testAPI = async (): Promise<void> => {
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('Health check:', healthResponse.data);

    // Test campaigns endpoint
    const campaignsResponse = await axios.get(`${API_URL}/campaign`);
    console.log('Campaigns:', campaignsResponse.data);

    console.log('API test completed successfully');
  } catch (error: any) {
    console.error('API test error:', error.message);
    process.exit(1);
  }
};

testAPI();

