# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6d16ad26-153d-4305-b039-a47c1926469d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6d16ad26-153d-4305-b039-a47c1926469d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Drizzle ORM
- PostgreSQL (Neon)
- GitHub Actions

## 🔒 Data Quality & UNK Prevention System

This project includes a comprehensive system to prevent `UNK` and `-` values from entering the database. The system provides multi-layered protection:

### Quick Start

```bash
# Validate data before ingestion
npm run validate:ingestion

# Check for UNK values in database
npm run monitor:unk

# Clean existing UNK values
npm run backfill:clean-unk:dry-run  # Preview changes
npm run backfill:clean-unk:delete   # Execute cleanup

# Run integration tests
npm run test:unk-prevention
```

### Features

- ✅ **Database Constraints** - CHECK constraints prevent UNK/dash values at insertion
- ✅ **Pre-Ingestion Validation** - Validate data before it reaches the database
- ✅ **Automated Cleanup** - Scripts to find and remove existing bad data
- ✅ **Continuous Monitoring** - Automatic checks in CI/CD pipeline
- ✅ **Comprehensive Testing** - Integration tests verify system works correctly

### Documentation

- [`UNK_PREVENTION_GUIDE.md`](UNK_PREVENTION_GUIDE.md) - Complete usage guide
- [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [`db/migrations/0005_prevent_unk_values.sql`](db/migrations/0005_prevent_unk_values.sql) - Database constraints

### Architecture

The system implements defense in depth:

1. **Layer 1**: Pre-validation catches bad data before database
2. **Layer 2**: Database constraints enforce data quality
3. **Layer 3**: Continuous monitoring detects any issues
4. **Layer 4**: CI/CD integration blocks bad deployments

See the documentation for complete details on implementation and usage.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6d16ad26-153d-4305-b039-a47c1926469d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
