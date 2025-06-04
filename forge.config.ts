import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '{**/node_modules/chromadb/**/*,**/node_modules/chromadb-default-embed/**/*,**/node_modules/onnxruntime-node/**/*,**/node_modules/onnxruntime-common/**/*,**/node_modules/onnxruntime-web/**/*,**/node_modules/sharp/**/*,**/*.node}'
    },
    icon: './images/icon',
    name: 'LEMMA',
    osxSign: {},
    // Bundle the Python virtual environment
    extraResource: [
      './venv',
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: './images/icon.ico'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({})
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    generateAssets: async () => {
      console.log('Setting up Python environment for distribution...');

      const isWin = process.platform === 'win32';

      try {
        // Create virtual environment if it doesn't exist
        if (!existsSync('venv')) {
          console.log('Creating Python virtual environment...');
          try {
            execSync(isWin ? 'python -m venv venv' : 'python3 -m venv venv', { stdio: 'inherit' });
          } catch (e) {
            try {
              execSync(!isWin ? 'python -m venv venv' : 'python3 -m venv venv', { stdio: 'inherit' });
            } catch (e2) {
              console.error('Could not create virtual environment. Please ensure Python is installed correctly.');
              process.exit(1);
            }
          }
        }

        // Install ChromaDB
        const pip = isWin ? 'venv\\Scripts\\pip' : 'venv/bin/pip';
        console.log('Installing ChromaDB...');

        try {
          execSync(`${pip} install chromadb`, { stdio: 'inherit' });
        } catch (pipError) {
          console.error('Failed to install ChromaDB with pip. Trying pip3...');
          const pip3 = isWin ? 'venv\\Scripts\\pip3' : 'venv/bin/pip3';
          try {
            execSync(`${pip3} install chromadb`, { stdio: 'inherit' });
          } catch (pip3Error) {
            console.error('ChromaDB installation failed. You may need to run this with administrator/sudo privileges.');
            process.exit(1);
          }
        }

        // Create lemma-db directory if it doesn't exist
        if (!existsSync('lemma-db')) {
          mkdirSync('lemma-db', { recursive: true });
          console.log('Created lemma-db directory');
        }

        console.log('Python environment setup complete!');

      } catch (error) {
        console.error('Error setting up Python environment:', error);
        process.exit(1);
      }
    }
  }
};

export default config;