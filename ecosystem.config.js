// PM2 Ecosystem Configuration for OtoParcaPanel
// Production deployment on Hetzner Ubuntu 24.04

module.exports = {
  apps: [
    {
      // Backend Application
      name: 'otoparcapanel-backend',
      script: './backend/dist/main.js',
      cwd: '/var/www/otoparcapanel',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Environment file
      env_file: '.env.production',
      
      // Logging
      log_file: '/var/www/otoparcapanel/logs/backend-combined.log',
      out_file: '/var/www/otoparcapanel/logs/backend-out.log',
      error_file: '/var/www/otoparcapanel/logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      autorestart: true,
      watch: false, // Disable in production
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced settings
      node_args: '--max-old-space-size=1024',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Merge logs
      merge_logs: true,
      
      // Time zone
      time: true
    },
    
    {
      // Frontend Application
      name: 'otoparcapanel-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/otoparcapanel/frontend',
      instances: 1, // Next.js should run as single instance
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      
      // Environment file
      env_file: '../.env.production',
      
      // Logging
      log_file: '/var/www/otoparcapanel/logs/frontend-combined.log',
      out_file: '/var/www/otoparcapanel/logs/frontend-out.log',
      error_file: '/var/www/otoparcapanel/logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      autorestart: true,
      watch: false, // Disable in production
      max_memory_restart: '512M',
      restart_delay: 4000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Merge logs
      merge_logs: true,
      
      // Time zone
      time: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: ['YOUR_SERVER_IP'],
      ref: 'origin/main',
      repo: 'https://github.com/YOUR_USERNAME/OtoParcaPanel.git',
      path: '/var/www/otoparcapanel',
      
      // Pre-deploy commands
      'pre-deploy': 'git fetch --all',
      
      // Post-deploy commands
      'post-deploy': [
        'npm install --production',
        'cd backend && npm install --production',
        'cd backend && npm run build',
        'cd ../frontend && npm install --production',
        'cd frontend && npm run build',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // Pre-setup commands
      'pre-setup': [
        'apt update',
        'apt install -y nodejs npm postgresql nginx',
        'npm install -g pm2'
      ].join(' && '),
      
      // Post-setup commands
      'post-setup': [
        'pm2 install pm2-logrotate',
        'pm2 set pm2-logrotate:max_size 10M',
        'pm2 set pm2-logrotate:retain 7',
        'pm2 startup',
        'pm2 save'
      ].join(' && '),
      
      // Environment variables
      env: {
        NODE_ENV: 'production'
      }
    }
  },
  
  // PM2+ monitoring (optional)
  pmx: {
    enabled: true,
    
    // Network monitoring
    network: true,
    
    // Port monitoring
    ports: true,
    
    // Custom metrics
    custom_probes: true,
    
    // Transaction tracing
    transactions: true,
    
    // Ignore certain routes for monitoring
    ignore_routes: [
      /\/api\/health/,
      /\/_next\//,
      /\/favicon\.ico/
    ]
  }
};

// Additional PM2 configuration for specific environments
if (process.env.NODE_ENV === 'development') {
  // Development overrides
  module.exports.apps.forEach(app => {
    app.watch = true;
    app.ignore_watch = [
      'node_modules',
      'logs',
      '.git',
      'dist',
      '.next'
    ];
    app.instances = 1;
    app.exec_mode = 'fork';
  });
}

// Staging environment configuration
if (process.env.NODE_ENV === 'staging') {
  module.exports.apps.forEach(app => {
    app.instances = 1;
    app.max_memory_restart = '512M';
  });
}