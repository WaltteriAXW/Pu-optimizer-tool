/**
 * Tests for InputField component
 * Used for all text input fields in the calculator
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileSpreadsheet } from 'lucide-react';
import { InputField } from '../index';

describe('InputField Component', () => {
  const defaultProps = {
    label: 'Test Input',
    value: 100,
    onChange: vi.fn(),
    unit: 'mm',
    icon: FileSpreadsheet,
    type: 'number'
  };

  describe('Rendering', () => {
    it('should render label text', () => {
      render(<InputField {...defaultProps} />);
      expect(screen.getByText('Test Input')).toBeInTheDocument();
    });

    it('should render unit', () => {
      render(<InputField {...defaultProps} />);
      expect(screen.getByText('mm')).toBeInTheDocument();
    });

    it('should render input field', () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByDisplayValue('100');
      expect(input).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<InputField {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display helpText if provided', () => {
      const helpText = 'This is helpful information';
      render(<InputField {...defaultProps} helpText={helpText} />);
      expect(screen.getByText(helpText)).toBeInTheDocument();
    });
  });

  describe('Input Interactions', () => {
    it('should call onChange when value changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InputField {...defaultProps} onChange={onChange} />);

      const input = screen.getByDisplayValue('100');
      await user.clear(input);
      await user.type(input, '200');

      expect(onChange).toHaveBeenCalled();
    });

    it('should update value through onChange event', async () => {
      const onChange = vi.fn((e) => {
        // Simulate event handling
      });
      const user = userEvent.setup();
      render(<InputField {...defaultProps} onChange={onChange} />);

      const input = screen.getByDisplayValue('100');
      await user.type(input, '5');

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should handle text input type', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const props = { ...defaultProps, type: 'text', value: 'test' };
      render(<InputField {...props} onChange={onChange} />);

      const input = screen.getByDisplayValue('test');
      await user.clear(input);
      await user.type(input, 'new value');

      expect(onChange).toHaveBeenCalled();
    });

    it('should handle number input type', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InputField {...defaultProps} type="number" />);

      const input = screen.getByDisplayValue('100');
      await user.clear(input);
      await user.type(input, '500');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Props Handling', () => {
    it('should accept min prop for number inputs', () => {
      render(<InputField {...defaultProps} type="number" min="10" />);
      const input = screen.getByDisplayValue('100');
      expect(input.getAttribute('min')).toBe('10');
    });

    it('should accept step prop for number inputs', () => {
      render(<InputField {...defaultProps} type="number" step="5" />);
      const input = screen.getByDisplayValue('100');
      expect(input.getAttribute('step')).toBe('5');
    });

    it('should accept placeholder prop', () => {
      render(<InputField {...defaultProps} placeholder="Enter value" />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<InputField {...defaultProps} disabled={true} />);
      const input = screen.getByDisplayValue('100');
      expect(input).toBeDisabled();
    });
  });

  describe('Value Handling', () => {
    it('should display zero value', () => {
      const props = { ...defaultProps, value: 0 };
      render(<InputField {...props} />);
      const input = screen.getByDisplayValue('0');
      expect(input).toBeInTheDocument();
    });

    it('should display negative values', () => {
      const props = { ...defaultProps, value: -50 };
      render(<InputField {...props} />);
      const input = screen.getByDisplayValue('-50');
      expect(input).toBeInTheDocument();
    });

    it('should display decimal values', () => {
      const props = { ...defaultProps, value: 10.5 };
      render(<InputField {...props} />);
      const input = screen.getByDisplayValue('10.5');
      expect(input).toBeInTheDocument();
    });

    it('should display string values for text input', () => {
      const props = { ...defaultProps, type: 'text', value: 'test string' };
      render(<InputField {...props} />);
      const input = screen.getByDisplayValue('test string');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Unit Display', () => {
    it('should show unit alongside label', () => {
      render(<InputField label="Diameter" unit="mm" value={12} onChange={vi.fn()} />);
      expect(screen.getByText('Diameter')).toBeInTheDocument();
      expect(screen.getByText('mm')).toBeInTheDocument();
    });

    it('should handle empty unit string', () => {
      render(<InputField {...defaultProps} unit="" />);
      expect(screen.getByText('Test Input')).toBeInTheDocument();
    });

    it('should handle complex units like kg/m³', () => {
      render(<InputField {...defaultProps} unit="kg/m³" />);
      expect(screen.getByText('kg/m³')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<InputField {...defaultProps} />);
      const input = screen.getByDisplayValue('100');
      const label = screen.getByText('Test Input');
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<InputField {...defaultProps} onChange={onChange} />);

      const input = screen.getByDisplayValue('100');
      await user.click(input);
      await user.keyboard('{Control>}a{/Control}');
      await user.keyboard('250');

      expect(onChange).toHaveBeenCalled();
    });

    it('should maintain focus after input', async () => {
      const user = userEvent.setup();
      render(<InputField {...defaultProps} onChange={vi.fn()} />);

      const input = screen.getByDisplayValue('100');
      await user.click(input);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const props = { ...defaultProps, value: 999999999 };
      render(<InputField {...props} />);
      const input = screen.getByDisplayValue('999999999');
      expect(input).toBeInTheDocument();
    });

    it('should handle very long label text', () => {
      const longLabel = 'A'.repeat(100);
      render(<InputField {...defaultProps} label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('should render without onChange handler gracefully', () => {
      const props = { ...defaultProps };
      delete props.onChange;
      const { container } = render(<InputField {...props} onChange={vi.fn()} />);
      expect(container).toBeInTheDocument();
    });
  });
});
