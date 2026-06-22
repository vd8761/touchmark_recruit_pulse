"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AppSettings = {
  currencyCode: string;
  currencySymbol: string;
  currencyLocale: string;
  alertEmailId: string;
  inrConversionRate: number;
};

const defaultSettings: AppSettings = {
  currencyCode: "INR",
  currencySymbol: "₹",
  currencyLocale: "en-IN",
  alertEmailId: "",
  inrConversionRate: 83.50,
};

type SettingsContextType = {
  settings: AppSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  refreshSettings: async () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const baseCurrency = data.currencyCode || defaultSettings.currencyCode;
        let liveRate = data.inrConversionRate ? Number(data.inrConversionRate) : defaultSettings.inrConversionRate;
        
        try {
          if (baseCurrency !== "INR") {
            const cacheKey = `exchange_rate_${baseCurrency}_INR`;
            const cachedDate = localStorage.getItem(`${cacheKey}_date`);
            const cachedRate = localStorage.getItem(cacheKey);
            const today = new Date().toISOString().split('T')[0];

            if (cachedDate === today && cachedRate) {
              liveRate = Number(cachedRate);
            } else {
              const rateRes = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
              if (rateRes.ok) {
                const rateData = await rateRes.json();
                if (rateData && rateData.rates && rateData.rates.INR) {
                  liveRate = rateData.rates.INR;
                  localStorage.setItem(cacheKey, liveRate.toString());
                  localStorage.setItem(`${cacheKey}_date`, today);
                  // Synchronize the DB with the live rate in background
                  fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inrConversionRate: liveRate })
                  }).catch(() => {});
                }
              }
            }
          } else {
            liveRate = 1;
          }
        } catch (e) {
          console.error("Failed to fetch live exchange rate, using DB value", e);
        }

        // Merge with defaults to ensure we always have values even if DB is empty
        setSettings({
          currencyCode: baseCurrency,
          currencySymbol: data.currencySymbol || defaultSettings.currencySymbol,
          currencyLocale: data.currencyLocale || defaultSettings.currencyLocale,
          alertEmailId: data.alertEmailId || defaultSettings.alertEmailId,
          inrConversionRate: liveRate,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
