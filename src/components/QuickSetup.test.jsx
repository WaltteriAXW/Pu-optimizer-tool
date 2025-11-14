/* eslint-disable react/prop-types */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickSetup } from './QuickSetup';
import * as dimensionsDatabaseLoader from '../utils/dimensionsDatabaseLoader';

// Mock the database loader
vi.mock('../utils/dimensionsDatabaseLoader', () => ({
  loadPipeDatabase: vi.fn(),
  loadMoldDatabase: vi.fn(),
  suggestPipeForMold: vi.fn(),
  getRecommendedMolds: vi.fn(),
  calculateMaterialRequirements: vi.fn(),
  getAvailableDiameters: vi.fn(),
  filterPipesByDiameter: vi.fn(),
  getAvailableMoldShapes: vi.fn(),
  filterMoldsByShape: vi.fn(),
  filterMoldsByVolume: vi.fn(),
  filterMoldsByApplication: vi.fn()
}));

// Mock error tracking
vi.mock('../utils/errorTracking', () => ({
  logError: vi.fn(),
  logInfo: vi.fn()
}));

describe('QuickSetup Component', () => {
  const mockOnApplyConfiguration = vi.fn();
  const mockOnClose = vi.fn();

  const mockPipes = [
    {
      pipe_id: 1,
      type: 'Standard Pipe 12mm',
      inner_diameter_mm: 12,
      length_mm: 500,
      volume_liters: 0.0565,
      recommended_max_pressure_bar: 6.0
    },
    {
      pipe_id: 2,
      type: 'Standard Pipe 25mm',
      inner_diameter_mm: 25,
      length_mm: 1000,
      volume_liters: 0.4909,
      recommended_max_pressure_bar: 6.0
    }
  ];

  const mockMolds = [
    {
      mold_id: 1,
      type: 'Small Panel',
      shape: 'Rectangular',
      length_mm: 1000,
      width_mm: 500,
      height_thickness_mm: 50,
      volume_liters: 25,
      application: 'Insulation'
    },
    {
      mold_id: 2,
      type: 'Medium Panel',
      shape: 'Rectangular',
      length_mm: 2000,
      width_mm: 600,
      height_thickness_mm: 60,
      volume_liters: 72,
      application: 'Construction'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    dimensionsDatabaseLoader.loadPipeDatabase.mockResolvedValue(mockPipes);
    dimensionsDatabaseLoader.loadMoldDatabase.mockResolvedValue(mockMolds);
    dimensionsDatabaseLoader.getRecommendedMolds.mockReturnValue(mockMolds.slice(0, 6));
    dimensionsDatabaseLoader.suggestPipeForMold.mockReturnValue(mockPipes[0]);
    dimensionsDatabaseLoader.calculateMaterialRequirements.mockReturnValue({
      polyol: 14,
      isocyanate: 15.4,
      total: 29.4
    });
    dimensionsDatabaseLoader.getAvailableDiameters.mockReturnValue([12, 25]);
    dimensionsDatabaseLoader.filterPipesByDiameter.mockReturnValue(mockPipes);
    dimensionsDatabaseLoader.getAvailableMoldShapes.mockReturnValue(['Rectangular', 'Cylindrical']);
    dimensionsDatabaseLoader.filterMoldsByShape.mockReturnValue(mockMolds);
    dimensionsDatabaseLoader.filterMoldsByVolume.mockImplementation((molds, min, max) => molds);
    dimensionsDatabaseLoader.filterMoldsByApplication.mockImplementation((molds, app) => molds);
  });

  describe('Rendering', () => {
    it('should show loading state initially', async () => {
      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      expect(screen.getByText(/loading databases/i)).toBeInTheDocument();

      // Wait for async state updates to complete
      await waitFor(() => {
        expect(dimensionsDatabaseLoader.loadPipeDatabase).toHaveBeenCalled();
      });
    });

    it('should not render when isOpen is false', async () => {
      const { container } = render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={false}
        />
      );

      expect(container).toBeEmptyDOMElement();

      // Allow any pending state updates to complete
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });

    it('should render Quick Setup card after loading', async () => {
      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/quick setup from database/i)).toBeInTheDocument();
      });
    });

    it('should show error state when database loading fails', async () => {
      dimensionsDatabaseLoader.loadPipeDatabase.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/database loading failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/refresh page/i)).toBeInTheDocument();
    });
  });

  describe('Mold Selection', () => {
    it('should display recommended molds', async () => {
      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
        expect(screen.getByText('Medium Panel')).toBeInTheDocument();
      });
    });

    it('should select a mold when clicked', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Small Panel'));

      // Mold should be selected and displayed
      await waitFor(() => {
        expect(screen.getByText('Rectangular • 25.00L')).toBeInTheDocument();
      });
    });

    it('should auto-suggest pipe when mold is selected', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Small Panel'));

      await waitFor(() => {
        // Pipe should be auto-selected
        expect(dimensionsDatabaseLoader.suggestPipeForMold).toHaveBeenCalled();
      });
    });
  });

  describe('Configuration Application', () => {
    it('should call onApplyConfiguration with correct data', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      // Wait for loading
      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
      });

      // Select a mold
      await user.click(screen.getByText('Small Panel'));

      // Wait for mold to be selected
      await waitFor(() => {
        expect(screen.getByText('Rectangular • 25.00L')).toBeInTheDocument();
      });

      // Click Apply Configuration button
      const applyButton = screen.getByRole('button', { name: /apply configuration/i });
      await user.click(applyButton);

      // Verify configuration callback was called
      expect(mockOnApplyConfiguration).toHaveBeenCalledTimes(1);

      const calledConfig = mockOnApplyConfiguration.mock.calls[0][0];

      // Verify config has mold data
      expect(calledConfig.moldVolume).toBe(25);
      expect(calledConfig.moldShape).toBe('rectangular');
      expect(calledConfig.moldDimensions).toEqual({
        length: 1000,
        width: 500,
        height: 50
      });

      // Verify config has pipe data (auto-suggested)
      expect(calledConfig.pipeDiameter).toBe(12);
      expect(calledConfig.pipeLength).toBe(500);
    });

    it('should call onClose when configuration is applied', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          onClose={mockOnClose}
          isOpen={true}
        />
      );

      // Wait for loading
      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
      });

      // Select a mold
      await user.click(screen.getByText('Small Panel'));

      // Wait for selection
      await waitFor(() => {
        expect(screen.getByText('Rectangular • 25.00L')).toBeInTheDocument();
      });

      // Apply
      const applyButton = screen.getByRole('button', { name: /apply configuration/i });
      await user.click(applyButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not apply if no mold or pipe selected', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/quick setup/i)).toBeInTheDocument();
      });

      // Try to apply without selecting anything
      const applyButton = screen.getByRole('button', { name: /apply configuration/i });
      await user.click(applyButton);

      // Should not have called the callback
      expect(mockOnApplyConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('Clear Selection', () => {
    it('should clear mold selection when Clear button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <QuickSetup
          onApplyConfiguration={mockOnApplyConfiguration}
          isOpen={true}
        />
      );

      // Wait for molds to load
      await waitFor(() => {
        expect(screen.getByText('Small Panel')).toBeInTheDocument();
      });

      // Select a mold
      await user.click(screen.getByText('Small Panel'));

      // Mold should be selected
      await waitFor(() => {
        expect(screen.getByText('Rectangular • 25.00L')).toBeInTheDocument();
      });

      // Click Clear button
      const clearButton = screen.getAllByText('Clear')[0];
      await user.click(clearButton);

      // Mold selection should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Rectangular • 25.00L')).not.toBeInTheDocument();
      });
    });
  });
});
