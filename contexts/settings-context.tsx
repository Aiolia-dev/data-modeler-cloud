"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

// Define the shape of our diagram settings
interface DiagramSettings {
  // Entity display settings
  showEntityAttributes: boolean;
  showPrimaryKeys: boolean;
  showForeignKeys: boolean;
  showStandardAttributes: boolean;
  
  // Relationship display settings
  showRelationshipNames: boolean;
  showCardinalityIndicators: boolean;
  showForeignKeyIndicators: boolean;
  showAttributeTypeMarkers: boolean;
}

// Define default values for diagram settings
const defaultDiagramSettings: DiagramSettings = {
  // Entity display settings - all visible by default
  showEntityAttributes: true,
  showPrimaryKeys: true,
  showForeignKeys: true,
  showStandardAttributes: true,  // Changed to true by default
  
  // Relationship display settings
  showRelationshipNames: true,
  showCardinalityIndicators: true,
  showForeignKeyIndicators: true,
  showAttributeTypeMarkers: true,
};

// Define the shape of our settings context
interface SettingsContextType {
  diagramSettings: DiagramSettings;
  updateDiagramSettings: (settings: Partial<DiagramSettings>) => void;
  resetDiagramSettings: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Create the context with a default value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Create a provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with default values
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(defaultDiagramSettings);
  const { theme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('diagramSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setDiagramSettings({
          ...defaultDiagramSettings,
          ...parsedSettings
        });
      } catch (error) {
        console.error('Error parsing saved diagram settings:', error);
        // If there's an error parsing, use default settings
        setDiagramSettings(defaultDiagramSettings);
      }
    }
    
    // Initialize dark mode state based on theme
    setIsDarkMode(theme === 'dark');
  }, [theme]);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDarkMode(newTheme === 'dark');
  };

  // Update settings and save to localStorage
  const updateDiagramSettings = (newSettings: Partial<DiagramSettings>) => {
    setDiagramSettings(prevSettings => {
      const updatedSettings = {
        ...prevSettings,
        ...newSettings
      };
      
      // Save to localStorage
      localStorage.setItem('diagramSettings', JSON.stringify(updatedSettings));
      
      return updatedSettings;
    });
  };

  // Reset settings to defaults
  const resetDiagramSettings = () => {
    setDiagramSettings(defaultDiagramSettings);
    localStorage.setItem('diagramSettings', JSON.stringify(defaultDiagramSettings));
  };

  return (
    <SettingsContext.Provider
      value={{
        diagramSettings,
        updateDiagramSettings,
        resetDiagramSettings,
        isDarkMode,
        toggleDarkMode
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
