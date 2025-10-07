#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectSizeAnalyzer {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
    this.results = {
      largeFiles: [],
      unusedDependencies: [],
      devTestFiles: [],
      buildArtifacts: [],
      recommendations: [],
      totalSavings: 0
    };
  }

  // Convert bytes to human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file size safely
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.isFile() ? stats.size : 0;
    } catch (error) {
      return 0;
    }
  }

  // Get directory size recursively
  getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors for directories we can't read
    }
    return totalSize;
  }

  // Scan for large files (>5MB by default)
  scanLargeFiles(directory = this.projectPath, threshold = 5 * 1024 * 1024, excludeDirs = []) {
    const defaultExcludes = ['node_modules', '.git', '.next', 'dist', 'build'];
    const allExcludes = [...defaultExcludes, ...excludeDirs];
    
    try {
      const items = fs.readdirSync(directory);
      
      for (const item of items) {
        const itemPath = path.join(directory, item);
        const relativePath = path.relative(this.projectPath, itemPath);
        
        // Skip excluded directories
        if (allExcludes.some(exclude => relativePath.includes(exclude))) {
          continue;
        }

        try {
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            this.scanLargeFiles(itemPath, threshold, excludeDirs);
          } else if (stats.size > threshold) {
            this.results.largeFiles.push({
              path: relativePath,
              size: stats.size,
              sizeFormatted: this.formatFileSize(stats.size),
              type: path.extname(item).toLowerCase()
            });
          }
        } catch (error) {
          // Skip files we can't access
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${directory}`);
    }
  }

  // Analyze unused dependencies
  analyzeUnusedDependencies() {
    if (!fs.existsSync(this.packageJsonPath)) {
      console.warn('package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Common patterns that indicate potential unused dependencies
      const suspiciousDependencies = [];
      
      // Check for conflicting frameworks
      const frameworks = ['react', 'vue', 'svelte', '@remix-run/react', '@sveltejs/kit'];
      const detectedFrameworks = frameworks.filter(fw => dependencies[fw]);
      
      if (detectedFrameworks.length > 1) {
        // If using React, other frameworks are likely unused
        const mainFramework = detectedFrameworks.includes('react') ? 'react' : detectedFrameworks[0];
        const unusedFrameworks = detectedFrameworks.filter(fw => fw !== mainFramework);
        
        for (const unused of unusedFrameworks) {
          suspiciousDependencies.push({
            name: unused,
            reason: `Multiple frameworks detected. Using ${mainFramework}, so ${unused} may be unused`,
            size: 'Unknown',
            removeCommand: `npm uninstall ${unused}`
          });
        }
      }

      // Check for unused Radix UI components by scanning code
      const radixComponents = Object.keys(dependencies).filter(dep => dep.startsWith('@radix-ui/'));
      for (const component of radixComponents) {
        if (!this.isPackageUsed(component)) {
          suspiciousDependencies.push({
            name: component,
            reason: 'Radix UI component not found in source code',
            size: 'Unknown',
            removeCommand: `npm uninstall ${component}`
          });
        }
      }

      // Check for packages using "latest" version (potential for optimization)
      const latestVersionPackages = Object.entries(dependencies)
        .filter(([name, version]) => version === 'latest')
        .map(([name]) => ({
          name,
          reason: 'Using "latest" version - consider pinning to specific version for better caching',
          size: 'Unknown',
          removeCommand: `npm install ${name}@^[specific-version]`
        }));

      this.results.unusedDependencies = [...suspiciousDependencies, ...latestVersionPackages];
      
    } catch (error) {
      console.warn('Error analyzing dependencies:', error.message);
    }
  }

  // Check if a package is used in the codebase
  isPackageUsed(packageName) {
    const searchDirs = ['app', 'components', 'lib', 'hooks', 'pages', 'src'];
    const importPatterns = [
      `from "${packageName}"`,
      `from '${packageName}'`,
      `require("${packageName}")`,
      `require('${packageName}')`
    ];

    for (const dir of searchDirs) {
      const dirPath = path.join(this.projectPath, dir);
      if (fs.existsSync(dirPath)) {
        if (this.searchInDirectory(dirPath, importPatterns)) {
          return true;
        }
      }
    }
    return false;
  }

  // Search for patterns in directory
  searchInDirectory(directory, patterns) {
    try {
      const items = fs.readdirSync(directory);
      
      for (const item of items) {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          if (this.searchInDirectory(itemPath, patterns)) {
            return true;
          }
        } else if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(item))) {
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            if (patterns.some(pattern => content.includes(pattern))) {
              return true;
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return false;
  }

  // Identify dev/test files and configs
  identifyDevTestFiles() {
    const devPatterns = [
      { pattern: '**/*.test.*', description: 'Test files' },
      { pattern: '**/*.spec.*', description: 'Spec files' },
      { pattern: '**/tests/**', description: 'Test directories' },
      { pattern: '**/test/**', description: 'Test directories' },
      { pattern: '**/__tests__/**', description: 'Test directories' },
      { pattern: '**/stories/**', description: 'Storybook files' },
      { pattern: '**/*.stories.*', description: 'Storybook files' },
      { pattern: 'README.md', description: 'Documentation' },
      { pattern: 'CHANGELOG.md', description: 'Documentation' },
      { pattern: '.env.local', description: 'Local environment config' },
      { pattern: '.env.development', description: 'Development environment config' },
      { pattern: 'jest.config.*', description: 'Jest configuration' },
      { pattern: 'cypress.config.*', description: 'Cypress configuration' },
      { pattern: '.storybook/**', description: 'Storybook configuration' },
      { pattern: 'docs/**', description: 'Documentation folder' }
    ];

    for (const { pattern, description } of devPatterns) {
      const files = this.findFilesMatching(pattern);
      if (files.length > 0) {
        this.results.devTestFiles.push({
          pattern,
          description,
          files,
          totalSize: files.reduce((sum, file) => sum + this.getFileSize(file), 0),
          removeCommand: files.length === 1 ? 
            `Remove-Item "${files[0]}"` : 
            `Remove-Item ${files.map(f => `"${f}"`).join(', ')}`
        });
      }
    }
  }

  // Find files matching a pattern
  findFilesMatching(pattern, directory = this.projectPath) {
    const results = [];
    const globPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/\\\\]*');
    const regex = new RegExp(globPattern.replace(/\//g, '[\\\\/]'));

    const scan = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const relativePath = path.relative(this.projectPath, itemPath);
          
          // Skip node_modules and .git
          if (relativePath.includes('node_modules') || relativePath.includes('.git')) {
            continue;
          }

          try {
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
              scan(itemPath);
            } else if (regex.test(relativePath)) {
              results.push(itemPath);
            }
          } catch (error) {
            // Skip files we can't access
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scan(directory);
    return results;
  }

  // Analyze .next build artifacts
  analyzeBuildArtifacts() {
    const nextDir = path.join(this.projectPath, '.next');
    if (!fs.existsSync(nextDir)) {
      console.log('No .next directory found. Run "npm run build" first to analyze build artifacts.');
      return;
    }

    const staticDir = path.join(nextDir, 'static');
    if (fs.existsSync(staticDir)) {
      const staticSize = this.getDirectorySize(staticDir);
      this.results.buildArtifacts.push({
        path: '.next/static',
        size: staticSize,
        sizeFormatted: this.formatFileSize(staticSize),
        description: 'Built static assets'
      });

      // Analyze chunks directory for large JavaScript files
      const chunksDir = path.join(staticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        this.scanLargeFiles(chunksDir, 1024 * 1024, []); // 1MB threshold for chunks
      }
    }

    // Check for source maps
    const sourceMaps = this.findFilesMatching('**/*.map', nextDir);
    if (sourceMaps.length > 0) {
      const mapSize = sourceMaps.reduce((sum, file) => sum + this.getFileSize(file), 0);
      this.results.buildArtifacts.push({
        path: '.next/**/*.map',
        size: mapSize,
        sizeFormatted: this.formatFileSize(mapSize),
        description: 'Source maps (not needed for production)',
        removeCommand: 'Remove-Item ".next/**/*.map" -Recurse'
      });
    }
  }

  // Generate comprehensive recommendations
  generateRecommendations() {
    const recommendations = [];
    let estimatedSavings = 0;

    // Large files recommendations
    if (this.results.largeFiles.length > 0) {
      recommendations.push({
        category: '🔍 Large Files Found',
        items: this.results.largeFiles.map(file => ({
          issue: `Large file: ${file.path} (${file.sizeFormatted})`,
          action: file.type === '.pdf' || file.type === '.mp4' || file.type === '.mov' ? 
            'Move to CDN or external storage' : 
            'Review if file is necessary or can be optimized',
          command: file.type.match(/\.(pdf|mp4|mov|avi|zip|tar|gz)$/) ? 
            `Remove-Item "${file.path}"` : 
            `# Review file: ${file.path}`,
          savings: file.size
        })),
        totalSavings: this.results.largeFiles.reduce((sum, file) => sum + file.size, 0)
      });
    }

    // Unused dependencies
    if (this.results.unusedDependencies.length > 0) {
      const depSavings = this.results.unusedDependencies.length * 10 * 1024 * 1024; // Estimate 10MB per unused dep
      recommendations.push({
        category: '📦 Dependency Optimization',
        items: this.results.unusedDependencies.map(dep => ({
          issue: `${dep.name}: ${dep.reason}`,
          action: 'Remove or replace with specific version',
          command: dep.removeCommand,
          savings: 10 * 1024 * 1024 // Estimate
        })),
        totalSavings: depSavings
      });
      estimatedSavings += depSavings;
    }

    // Dev/test files
    if (this.results.devTestFiles.length > 0) {
      const devSavings = this.results.devTestFiles.reduce((sum, item) => sum + item.totalSize, 0);
      recommendations.push({
        category: '🧪 Development Files',
        items: this.results.devTestFiles.map(item => ({
          issue: `${item.description}: ${item.files.length} files (${this.formatFileSize(item.totalSize)})`,
          action: 'Remove for production deployment',
          command: item.removeCommand,
          savings: item.totalSize
        })),
        totalSavings: devSavings
      });
      estimatedSavings += devSavings;
    }

    // Build artifacts
    if (this.results.buildArtifacts.length > 0) {
      const buildSavings = this.results.buildArtifacts.reduce((sum, item) => sum + item.size, 0);
      recommendations.push({
        category: '🏗️ Build Optimization',
        items: this.results.buildArtifacts.map(item => ({
          issue: `${item.description}: ${item.sizeFormatted}`,
          action: 'Optimize build configuration',
          command: item.removeCommand || '# Configure next.config.mjs for production',
          savings: item.size
        })),
        totalSavings: buildSavings
      });
      estimatedSavings += buildSavings;
    }

    // Additional Next.js specific recommendations
    recommendations.push({
      category: '⚡ Next.js Optimizations',
      items: [
        {
          issue: 'Bundle analyzer not configured',
          action: 'Add bundle analyzer to identify large dependencies',
          command: 'npm install --save-dev @next/bundle-analyzer',
          savings: 0
        },
        {
          issue: 'Image optimization',
          action: 'Ensure images are optimized and using next/image',
          command: '# Review all images in public/ directory',
          savings: 0
        },
        {
          issue: 'Dynamic imports',
          action: 'Use dynamic imports for large components',
          command: '# Convert large components to: const Component = dynamic(() => import("./Component"))',
          savings: 0
        }
      ],
      totalSavings: 0
    });

    this.results.recommendations = recommendations;
    this.results.totalSavings = estimatedSavings;
  }

  // Generate deployment-ready script
  generateDeploymentScript() {
    const commands = [];
    
    // Remove development dependencies
    commands.push('# Remove development dependencies');
    commands.push('npm prune --production');
    commands.push('');

    // Remove dev files
    commands.push('# Remove development and test files');
    this.results.devTestFiles.forEach(item => {
      commands.push(item.removeCommand);
    });
    commands.push('');

    // Remove unused dependencies
    commands.push('# Remove unused dependencies');
    this.results.unusedDependencies.forEach(dep => {
      commands.push(dep.removeCommand);
    });
    commands.push('');

    // Build optimizations
    commands.push('# Build for production');
    commands.push('npm run build');
    commands.push('');

    // Final cleanup
    commands.push('# Remove source maps and development artifacts');
    commands.push('Remove-Item ".next/**/*.map" -Recurse -ErrorAction SilentlyContinue');
    commands.push('Remove-Item "node_modules" -Recurse -Force');
    commands.push('npm ci --production');

    return commands.join('\n');
  }

  // Main analysis method
  async analyze() {
    console.log('🔍 Analyzing Next.js project for size optimization...\n');
    
    // Get current project size
    const currentSize = this.getDirectorySize(this.projectPath);
    console.log(`📊 Current project size: ${this.formatFileSize(currentSize)}\n`);

    console.log('1. Scanning for large files...');
    this.scanLargeFiles();
    
    console.log('2. Analyzing dependencies...');
    this.analyzeUnusedDependencies();
    
    console.log('3. Identifying development files...');
    this.identifyDevTestFiles();
    
    console.log('4. Analyzing build artifacts...');
    this.analyzeBuildArtifacts();
    
    console.log('5. Generating recommendations...\n');
    this.generateRecommendations();

    this.printResults();
  }

  // Print comprehensive results
  printResults() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('               PROJECT SIZE ANALYSIS REPORT                ');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Print recommendations by category
    this.results.recommendations.forEach(category => {
      console.log(`${category.category}`);
      console.log('─'.repeat(50));
      
      category.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.issue}`);
        console.log(`   Action: ${item.action}`);
        console.log(`   Command: ${item.command}`);
        if (item.savings > 0) {
          console.log(`   Estimated savings: ${this.formatFileSize(item.savings)}`);
        }
        console.log('');
      });
      
      if (category.totalSavings > 0) {
        console.log(`Category total savings: ${this.formatFileSize(category.totalSavings)}\n`);
      }
    });

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                        SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════');
    
    const currentSize = this.getDirectorySize(this.projectPath);
    const estimatedFinalSize = currentSize - this.results.totalSavings;
    
    console.log(`Current size: ${this.formatFileSize(currentSize)}`);
    console.log(`Estimated savings: ${this.formatFileSize(this.results.totalSavings)}`);
    console.log(`Estimated final size: ${this.formatFileSize(estimatedFinalSize)}`);
    console.log(`Target size (100MB): ${estimatedFinalSize < 100 * 1024 * 1024 ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}`);
    
    console.log('\n📋 STEP-BY-STEP OPTIMIZATION SCRIPT:');
    console.log('═'.repeat(60));
    console.log(this.generateDeploymentScript());
    
    console.log('\n💡 ADDITIONAL RECOMMENDATIONS:');
    console.log('═'.repeat(60));
    console.log('1. Run "npx @next/bundle-analyzer" to analyze bundle composition');
    console.log('2. Configure next.config.mjs with experimental.outputStandalone = true');
    console.log('3. Use Next.js Image Optimization for all images');
    console.log('4. Consider using dynamic imports for heavy components');
    console.log('5. Enable gzip compression on your hosting platform');
    console.log('6. Remove unused CSS using PurgeCSS or similar tools');
    
    console.log('\n⚠️  SAFETY NOTES:');
    console.log('═'.repeat(60));
    console.log('• Always test your application after removing dependencies');
    console.log('• Keep backups of your project before making changes');
    console.log('• Review each file before deletion');
    console.log('• Test deployment in staging environment first');
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new ProjectSizeAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = ProjectSizeAnalyzer;