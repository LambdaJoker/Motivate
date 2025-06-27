import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  input: {
    width: '300px',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px 0 0 4px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    border: '1px solid #007BFF',
    backgroundColor: '#007BFF',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '0 4px 4px 0',
  },
  resultsContainer: {
    marginTop: '20px',
  },
  resultItem: {
    border: '1px solid #eee',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  }
};

function App() {
  const [keywords, setKeywords] = useState('天安门');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!keywords) {
      setError('请输入关键词');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);

    try {
      // The "proxy" in package.json will prepend "http://localhost:3000"
      const response = await axios.get(`/api/amap/search?keywords=${keywords}`);
      if (response.data && response.data.status === '1' && response.data.pois) {
        setResults(response.data.pois);
      } else {
        setError(response.data.info || '未能找到结果');
      }
    } catch (err) {
      console.error('搜索出错:', err);
      setError('请求后端服务失败，请确保后端服务已启动。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>核心技术验证 (Spike)</h1>
      <div style={styles.searchContainer}>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="输入关键词进行搜索"
          style={styles.input}
        />
        <button onClick={handleSearch} disabled={loading} style={styles.button}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.resultsContainer}>
        {results.map((poi) => (
          <div key={poi.id} style={styles.resultItem}>
            <h4>{poi.name}</h4>
            <p>地址: {poi.address}</p>
            <p>类型: {poi.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
