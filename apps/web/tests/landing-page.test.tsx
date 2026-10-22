import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import LandingPage from '../src/app/page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  checkBackendHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    service: 'RepoMentor AI API',
    version: '0.1.0',
    timestamp: '2026-10-22T00:00:00Z',
  }),
  analyzeRepository: vi.fn().mockResolvedValue({
    metadata: {
      owner: 'testowner',
      name: 'testrepo',
      full_name: 'testowner/testrepo',
      description: 'A mock repository for testing',
      default_branch: 'main',
      commit_sha: '1234567890abcdef1234567890abcdef12345678',
      html_url: 'https://github.com/testowner/testrepo',
      language: 'TypeScript',
      stars_count: 100,
    },
    tree: [
      {
        path: 'src',
        name: 'src',
        type: 'dir',
        children: [
          {
            path: 'src/index.ts',
            name: 'index.ts',
            type: 'file',
            size: 512,
            is_binary: false,
            language: 'typescript',
          },
        ],
      },
      {
        path: 'README.md',
        name: 'README.md',
        type: 'file',
        size: 256,
        is_binary: false,
        language: 'markdown',
      },
    ],
    total_files: 2,
    status: 'analyzed',
  }),
  fetchFileContent: vi.fn().mockResolvedValue({
    path: 'README.md',
    commit_sha: '1234567890abcdef1234567890abcdef12345678',
    content: '# Test Repository\nThis is a test readme file.',
    size: 45,
    is_binary: false,
    language: 'markdown',
  }),
}));

describe('LandingPage Component (Phase 2)', () => {
  it('renders product branding and headline', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getAllByText(/RepoMentor AI/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { level: 1, name: /Deeply understand complex codebases/i })
    ).toBeInTheDocument();
  });

  it('renders repository URL input and analyze button', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    const input = screen.getByLabelText(/GitHub Repository URL/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Repository/i })).toBeInTheDocument();
  });

  it('displays a validation error when submitting an empty URL', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Repository/i });

    await act(async () => {
      fireEvent.click(analyzeBtn);
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Please provide a repository URL/i);
  });

  it('analyzes repository and displays live metadata and tree', async () => {
    await act(async () => {
      render(<LandingPage />);
    });

    const input = screen.getByLabelText(/GitHub Repository URL/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://github.com/testowner/testrepo' } });

    const form = input.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(api.analyzeRepository).toHaveBeenCalledWith('https://github.com/testowner/testrepo');
      expect(screen.getByText(/Successfully Ingested: testowner\/testrepo/i)).toBeInTheDocument();
      expect(screen.getAllByText(/README\.md/i).length).toBeGreaterThan(0);
    });
  });
});
