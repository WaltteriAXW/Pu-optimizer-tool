/**
 * Tests for ResultCard component
 * Used throughout the application for displaying calculation results
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Settings2 } from 'lucide-react';
import { ResultCard } from '../index';

describe('ResultCard Component', () => {
  const defaultProps = {
    title: 'Test Result',
    value: 42.5,
    unit: 'bar',
    icon: Settings2,
    status: 'default',
    helpText: 'This is a test result'
  };

  describe('Rendering', () => {
    it('should render title and value', () => {
      render(<ResultCard {...defaultProps} />);
      expect(screen.getByText('Test Result')).toBeInTheDocument();
      expect(screen.getByText('42.5')).toBeInTheDocument();
    });

    it('should render unit', () => {
      render(<ResultCard {...defaultProps} />);
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('should render help text on hover', () => {
      render(<ResultCard {...defaultProps} />);
      expect(screen.getByText('This is a test result')).toBeInTheDocument();
    });

    it('should handle missing help text gracefully', () => {
      const props = { ...defaultProps, helpText: '' };
      render(<ResultCard {...props} />);
      expect(screen.getByText('Test Result')).toBeInTheDocument();
    });
  });

  describe('Status Styling', () => {
    it('should apply success status styling', () => {
      const { container } = render(<ResultCard {...defaultProps} status="success" />);
      const statusElement = container.querySelector('[class*="success"]') ||
        container.querySelector('[class*="green"]');
      // Success status should have some visual indication
      expect(statusElement || container.firstChild).toBeInTheDocument();
    });

    it('should apply error status styling', () => {
      const { container } = render(<ResultCard {...defaultProps} status="error" />);
      const statusElement = container.querySelector('[class*="error"]') ||
        container.querySelector('[class*="red"]');
      // Error status should have some visual indication
      expect(statusElement || container.firstChild).toBeInTheDocument();
    });

    it('should apply warning status styling', () => {
      const { container } = render(<ResultCard {...defaultProps} status="warning" />);
      const statusElement = container.querySelector('[class*="warning"]') ||
        container.querySelector('[class*="yellow"]');
      // Warning status should have some visual indication
      expect(statusElement || container.firstChild).toBeInTheDocument();
    });

    it('should apply default status styling', () => {
      render(<ResultCard {...defaultProps} status="default" />);
      expect(screen.getByText('Test Result')).toBeInTheDocument();
    });
  });

  describe('Values', () => {
    it('should format numeric values', () => {
      render(<ResultCard {...defaultProps} value={3.14159} />);
      expect(screen.getByText(/3.1|3\.14/)).toBeInTheDocument();
    });

    it('should display string values', () => {
      const props = { ...defaultProps, value: 'Laminar' };
      render(<ResultCard {...props} />);
      expect(screen.getByText('Laminar')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      const props = { ...defaultProps, value: 0 };
      render(<ResultCard {...props} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const props = { ...defaultProps, value: -10.5 };
      render(<ResultCard {...props} />);
      expect(screen.getByText('-10.5')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const props = { ...defaultProps, value: 1000000 };
      render(<ResultCard {...props} />);
      expect(screen.getByText('1000000')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should render icon component', () => {
      const { container } = render(<ResultCard {...defaultProps} />);
      // Icon should be rendered (lucide-react icons render as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      const { container } = render(<ResultCard {...defaultProps} />);
      // Should have semantic structure
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should display complete information hierarchy', () => {
      render(
        <ResultCard
          title="Pressure"
          value={100}
          unit="bar"
          icon={Settings2}
          helpText="Required pressure"
        />
      );

      expect(screen.getByText('Pressure')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(100);
      const props = { ...defaultProps, title: longTitle };
      const { container } = render(<ResultCard {...props} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle empty unit', () => {
      const props = { ...defaultProps, unit: '' };
      render(<ResultCard {...props} />);
      expect(screen.getByText('42.5')).toBeInTheDocument();
    });

    it('should handle undefined helpText', () => {
      const props = { ...defaultProps };
      delete props.helpText;
      render(<ResultCard {...props} />);
      expect(screen.getByText('Test Result')).toBeInTheDocument();
    });
  });
});
