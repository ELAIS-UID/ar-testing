#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SmartComponentAnalyzer {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.usedComponents = new Set();
    this.unusedComponents = [];
    this.allRadixComponents = [];
  }

  // Scan for actually used Radix UI components
  scanUsedComponents() {
    console.log('🔍 Scanning for used Radix UI components...\n');
    
    // Get all Radix UI components from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectPath, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    this.allRadixComponents = Object.keys(dependencies).filter(dep => dep.startsWith('@radix-ui/'));
    
    // Scan components directory for imports
    this.scanDirectory(path.join(this.projectPath, 'components'));
    this.scanDirectory(path.join(this.projectPath, 'app'));
    this.scanDirectory(path.join(this.projectPath, 'lib'));
    this.scanDirectory(path.join(this.projectPath, 'hooks'));
    
    // Find unused components
    this.unusedComponents = this.allRadixComponents.filter(comp => !this.usedComponents.has(comp));
    
    console.log('✅ Analysis complete!\n');
  }

  scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        this.scanDirectory(itemPath);
      } else if (['.tsx', '.ts', '.jsx', '.js'].includes(path.extname(item))) {
        this.scanFile(itemPath);
      }
    }
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for Radix UI imports
      const importRegex = /import\s+.*?\s+from\s+["'](@radix-ui\/[^"']+)["']/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        this.usedComponents.add(match[1]);
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  // Generate optimized package.json commands
  generateOptimizationCommands() {
    const commands = [];
    let estimatedSavings = 0;

    console.log('📦 USED RADIX UI COMPONENTS:');
    console.log('─'.repeat(50));
    Array.from(this.usedComponents).sort().forEach(comp => {
      console.log(`✅ ${comp}`);
    });

    console.log('\n🗑️  UNUSED RADIX UI COMPONENTS:');
    console.log('─'.repeat(50));
    if (this.unusedComponents.length === 0) {
      console.log('✨ No unused Radix UI components found!');
    } else {
      this.unusedComponents.forEach(comp => {
        console.log(`❌ ${comp}`);
        commands.push(`npm uninstall ${comp}`);
        estimatedSavings += 2; // Estimate 2MB per component
      });
    }

    console.log('\n🔧 SAFE REMOVAL COMMANDS:');
    console.log('─'.repeat(50));
    if (commands.length > 0) {
      commands.forEach(cmd => console.log(cmd));
      console.log(`\nEstimated savings: ${estimatedSavings}MB`);
    } else {
      console.log('No safe removals available.');
    }

    return { commands, estimatedSavings };
  }

  // Generate dependency pinning commands for used components
  generatePinningCommands() {
    const latestVersions = {
      '@radix-ui/react-accordion': '^1.2.12',
      '@radix-ui/react-alert-dialog': '^1.1.15',
      '@radix-ui/react-aspect-ratio': '^1.1.3',
      '@radix-ui/react-avatar': '^1.1.5',
      '@radix-ui/react-checkbox': '^1.1.4',
      '@radix-ui/react-collapsible': '^1.1.3',
      '@radix-ui/react-context-menu': '^2.2.15',
      '@radix-ui/react-dialog': '^1.1.18',
      '@radix-ui/react-dropdown-menu': '^2.1.15',
      '@radix-ui/react-hover-card': '^1.1.5',
      '@radix-ui/react-label': '^2.1.3',
      '@radix-ui/react-menubar': '^1.1.5',
      '@radix-ui/react-navigation-menu': '^1.2.5',
      '@radix-ui/react-popover': '^1.1.15',
      '@radix-ui/react-progress': '^1.1.3',
      '@radix-ui/react-radio-group': '^1.2.3',
      '@radix-ui/react-scroll-area': '^1.2.2',
      '@radix-ui/react-select': '^2.1.15',
      '@radix-ui/react-separator': '^1.1.3',
      '@radix-ui/react-slider': '^1.2.3',
      '@radix-ui/react-slot': '^1.1.3',
      '@radix-ui/react-switch': '^1.1.3',
      '@radix-ui/react-tabs': '^1.1.5',
      '@radix-ui/react-toast': '^1.2.8',
      '@radix-ui/react-toggle': '^1.1.3',
      '@radix-ui/react-toggle-group': '^1.1.3',
      '@radix-ui/react-tooltip': '^1.1.10'
    };

    console.log('\n📌 VERSION PINNING COMMANDS (for used components):');
    console.log('─'.repeat(50));
    
    const pinCommands = [];
    Array.from(this.usedComponents).forEach(comp => {
      if (latestVersions[comp]) {
        const cmd = `npm install ${comp}@${latestVersions[comp]}`;
        console.log(cmd);
        pinCommands.push(cmd);
      }
    });

    return pinCommands;
  }

  printReport() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('            SMART COMPONENT OPTIMIZATION REPORT            ');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { commands, estimatedSavings } = this.generateOptimizationCommands();
    const pinCommands = this.generatePinningCommands();

    console.log('\n📋 COMPLETE OPTIMIZATION SCRIPT:');
    console.log('═'.repeat(60));
    
    if (commands.length > 0) {
      console.log('# Remove unused Radix UI components');
      commands.forEach(cmd => console.log(cmd));
      console.log('');
    }

    console.log('# Pin used components to specific versions');
    pinCommands.forEach(cmd => console.log(cmd));

    console.log('\n💡 SUMMARY:');
    console.log('─'.repeat(30));
    console.log(`Used components: ${this.usedComponents.size}`);
    console.log(`Unused components: ${this.unusedComponents.length}`);
    console.log(`Estimated savings: ${estimatedSavings}MB`);
    
    return { removeCommands: commands, pinCommands, estimatedSavings };
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new SmartComponentAnalyzer();
  analyzer.scanUsedComponents();
  analyzer.printReport();
}

module.exports = SmartComponentAnalyzer;