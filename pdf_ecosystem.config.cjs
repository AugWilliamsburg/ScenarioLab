module.exports = {
  apps: [
    {
      name: 'pdf-extractor',
      script: 'python3',
      args: '/home/user/webapp/pdf_server.py 3001',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        PYTHONUNBUFFERED: '1'
      }
    }
  ]
}
