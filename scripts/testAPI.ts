import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const testAPI = async (): Promise<void> => {
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/health`);

    // Test campaigns endpoint
    const campaignsResponse = await axios.get(`${API_URL}/campaign`);
  } catch (error: any) {
    process.exit(1);
  }
};

testAPI();

