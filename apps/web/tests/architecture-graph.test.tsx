import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchitectureGraph } from '../src/components/architecture/ArchitectureGraph';
import { DependencyGraph } from '@/lib/api';

describe('ArchitectureGraph Component', () => {
  const sampleGraph: DependencyGraph = {
    nodes: [
      {
        id: 'src/main.py',
        label: 'main.py',
        type: 'file',
        language: 'python',
        file_path: 'src/main.py',
        metrics: { in_degree: 0, out_degree: 1 },
      },
      {
        id: 'src/config.py',
        label: 'config.py',
        type: 'file',
        language: 'python',
        file_path: 'src/config.py',
        metrics: { in_degree: 1, out_degree: 0 },
      },
      {
        id: 'src/main.py::AppService',
        label: 'AppService',
        type: 'symbol',
        symbol_kind: 'class',
        file_path: 'src/main.py',
        line: 10,
        metrics: {},
      },
    ],
    edges: [
      {
        source: 'src/main.py',
        target: 'src/config.py',
        kind: 'imports',
        label: 'settings',
      },
      {
        source: 'src/main.py',
        target: 'src/main.py::AppService',
        kind: 'defines',
        label: 'class',
      },
    ],
    total_files_analyzed: 2,
    total_symbols_extracted: 1,
    entry_points: ['src/main.py'],
  };

  it('renders graph metrics and nodes', () => {
    const onSelect = vi.fn();
    render(
      <ArchitectureGraph
        graph={sampleGraph}
        isLoading={false}
        error={null}
        onSelectNode={onSelect}
      />
    );

    expect(screen.getByText(/Dependency & Architecture Graph/i)).toBeInTheDocument();
    expect(screen.getByText(/2 modules • 1 import edges • 1 symbols/i)).toBeInTheDocument();
    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('config.py')).toBeInTheDocument();
    expect(screen.getByText('AppService')).toBeInTheDocument();
  });

  it('identifies and displays entry points', () => {
    const onSelect = vi.fn();
    render(
      <ArchitectureGraph
        graph={sampleGraph}
        isLoading={false}
        error={null}
        onSelectNode={onSelect}
      />
    );

    expect(screen.getByText(/Inferred Application Entry Points/i)).toBeInTheDocument();
    expect(screen.getAllByText('src/main.py').length).toBeGreaterThan(0);
  });

  it('filters nodes when selecting Files only or Symbols only', () => {
    const onSelect = vi.fn();
    render(
      <ArchitectureGraph
        graph={sampleGraph}
        isLoading={false}
        error={null}
        onSelectNode={onSelect}
      />
    );

    const filesBtn = screen.getByRole('button', { name: /Files \(2\)/i });
    fireEvent.click(filesBtn);

    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.queryByText('AppService')).not.toBeInTheDocument();

    const symbolsBtn = screen.getByRole('button', { name: /Symbols \(1\)/i });
    fireEvent.click(symbolsBtn);

    expect(screen.queryByText('main.py')).not.toBeInTheDocument();
    expect(screen.getByText('AppService')).toBeInTheDocument();
  });

  it('calls onSelectNode when clicking a node', () => {
    const onSelect = vi.fn();
    render(
      <ArchitectureGraph
        graph={sampleGraph}
        isLoading={false}
        error={null}
        onSelectNode={onSelect}
      />
    );

    const appServiceBtn = screen.getByText('AppService');
    fireEvent.click(appServiceBtn.closest('button')!);

    expect(onSelect).toHaveBeenCalledWith('src/main.py', 10);
  });
});
