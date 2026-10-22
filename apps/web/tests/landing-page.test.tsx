import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LandingPage from '../src/app/page';

vi.mock('@/lib/api', () => ({
  checkBackendHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    service: 'RepoMentor AI API',
    version: '0.1.0',
    timestamp: '2026-10-22T00:00:00Z',
  }),
}));

describe('LandingPage Component', () => {
  it('renders product branding and key call to action', async () => {
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

  it('renders the three-panel workspace preview with preview notice', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    expect(screen.getByLabelText(/Three Panel Workspace Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
    expect(screen.getAllByText(/fastapi\/applications\.py/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/AI Tutor Avatar/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PREVIEW/i).length).toBeGreaterThan(0);
  });

  it('displays a validation error when submitting an empty or invalid URL', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Repository/i });

    // Submit empty input
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Please provide a repository URL/i);
  });

  it('accepts sample repository clicks and populates input', async () => {
    await act(async () => {
      render(<LandingPage />);
    });
    const sampleBtn = screen.getByRole('button', { name: /fastapi\/fastapi/i });
    await act(async () => {
      fireEvent.click(sampleBtn);
    });

    const input = screen.getByLabelText(/GitHub Repository URL/i) as HTMLInputElement;
    expect(input.value).toBe('https://github.com/fastapi/fastapi');
  });
});
