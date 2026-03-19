## Notas

Usar siempre configuración tsx no ts, ya que con este ultimo da errores y hay que crear un nodemonjson en cambio con tsx solo se configura esta linea ""dev": "tsx watch src/index.ts".

El archivo **package.json** tiene que quedar así inicialmente:

```
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "clean": "rimraf dist",
    "prebuild": "npm run clean"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.19.37",
    "rimraf": "^6.1.3",
    "tsx": "^4.21.0",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "@sendgrid/mail": "^8.1.3",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^5.0.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.3.0",
    "morgan": "^1.10.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

El archivo **tsconfig.json:** tien que quedar:

```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],

    "rootDir": "./src",
    "outDir": "./dist",

    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,

    "strict": true,
    "noUncheckedIndexedAccess": false,
    "exactOptionalPropertyTypes": false,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,

    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

Los archivos tienen que ser nombrados con extensión ".ts" y en la importación tiene que quedar con extensión "js", ejemplo: "import DatabaseConnection from './config/database.js';"