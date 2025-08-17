# Personal Portfolio Website

A modern, responsive personal portfolio website with dynamic background management and GitHub integration.

## Features

- Dynamic background image management
- GitHub API integration for enhanced rate limits
- Responsive design with modern UI/UX
- Multi-language support (English/Chinese)
- Error suppression for external services

## Setup

### GitHub Token Configuration

To use the GitHub API with higher rate limits, you need to configure a Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with `public_repo` scope
3. Copy the token
4. Create a `config.json` file in the root directory:

```json
{
  "githubToken": "your_actual_token_here"
}
```

**Important**: Never commit your actual token to Git. The `config.json` file is already in `.gitignore`.

### Alternative: Manual Token Setup

If you prefer not to use a config file, you can manually set the token in your browser's developer console:

```javascript
localStorage.setItem('github_token', 'your_actual_token_here');
```

## Development

The project uses vanilla JavaScript, HTML, and CSS. No build process is required.

## Security Notes

- GitHub tokens are stored locally and never sent to external servers
- The `config.json` file is excluded from Git tracking
- Use `config.example.json` as a template for your configuration
