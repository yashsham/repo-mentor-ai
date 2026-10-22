import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from '../src/components/repository/FileTree';
import { CodeViewer } from '../src/components/code-viewer/CodeViewer';
import { FileNode, FileContentResponse } from '@/lib/api';

describe('FileTree Component', () => {
  const sampleTree: FileNode[] = [
    {
      path: 'src',
      name: 'src',
      type: 'dir',
      children: [
        {
          path: 'src/main.py',
          name: 'main.py',
          type: 'file',
          size: 1024,
          is_binary: false,
          language: 'python',
        },
        {
          path: 'src/logo.png',
          name: 'logo.png',
          type: 'file',
          size: 2048,
          is_binary: true,
          language: null,
        },
      ],
    },
    {
      path: 'README.md',
      name: 'README.md',
      type: 'file',
      size: 500,
      is_binary: false,
      language: 'markdown',
    },
  ];

  it('renders root files and directories', () => {
    const onSelect = vi.fn();
    render(<FileTree tree={sampleTree} selectedPath={null} onSelectFile={onSelect} />);

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('filters files when typing in search input', () => {
    const onSelect = vi.fn();
    render(<FileTree tree={sampleTree} selectedPath={null} onSelectFile={onSelect} />);

    const searchInput = screen.getByPlaceholderText(/Filter files/i);
    fireEvent.change(searchInput, { target: { value: 'README' } });

    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('logo.png')).not.toBeInTheDocument();
  });

  it('calls onSelectFile when clicking a file node', () => {
    const onSelect = vi.fn();
    render(<FileTree tree={sampleTree} selectedPath={null} onSelectFile={onSelect} />);

    const readmeBtn = screen.getByText('README.md');
    fireEvent.click(readmeBtn);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'README.md', name: 'README.md' })
    );
  });
});

describe('CodeViewer Component', () => {
  const sampleFile: FileContentResponse = {
    path: 'src/main.py',
    commit_sha: 'abcdef1234567890',
    content: 'def hello():\n    print("Hello from RepoMentor")\n',
    size: 52,
    is_binary: false,
    language: 'python',
  };

  it('renders file content with line numbers', () => {
    render(
      <CodeViewer
        selectedPath="src/main.py"
        fileData={sampleFile}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('src/main.py')).toBeInTheDocument();
    expect(screen.getByText(/def hello\(\):/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(
      <CodeViewer
        selectedPath="src/main.py"
        fileData={null}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.getByText(/Loading src\/main\.py/i)).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    render(
      <CodeViewer
        selectedPath="src/main.py"
        fileData={null}
        isLoading={false}
        error="File not found on remote"
      />
    );

    expect(screen.getByText(/Failed to Load File/i)).toBeInTheDocument();
    expect(screen.getByText('File not found on remote')).toBeInTheDocument();
  });

  it('displays binary file notice for binary formats', () => {
    const binaryFile: FileContentResponse = {
      path: 'assets/logo.png',
      commit_sha: 'abcdef',
      content: '',
      size: 1024,
      is_binary: true,
      language: null,
    };

    render(
      <CodeViewer
        selectedPath="assets/logo.png"
        fileData={binaryFile}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/Binary File Detected/i)).toBeInTheDocument();
  });
});
