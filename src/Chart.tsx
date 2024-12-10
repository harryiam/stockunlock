import * as React from 'react';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Label, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@mui/material/styles';

interface Transaction {
  action: 'B' | 'S'; // Only 'B' or 'S' are allowed for action
  date: string;
  price: number;
  quantity: number;
  positionAveragePrice?: number | null;
}

interface StockPriceData {
  [timestamp: string]: {
    close: number;
    timestamp: number;
  };
}

interface PortfolioValueData {
  date: string;
  value: number;
}

const formatDate = (epoch: number): string => {
  return new Date(epoch * 1000).toISOString().split('T')[0];
};

const calculatePortfolioValue = (
  transactions: Transaction[],
  stockPrices: StockPriceData
): PortfolioValueData[] => {
  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentShares = 0;
  const portfolioValues: PortfolioValueData[] = [];

  const formattedStockPrices: { [date: string]: number } = {};
  Object.entries(stockPrices).forEach(([epoch, priceData]) => {
    const dateKey = formatDate(priceData.timestamp);
    formattedStockPrices[dateKey] = priceData.close;
  });

  const allDates = new Set([
    ...sortedTransactions.map(t => t.date),
    ...Object.keys(formattedStockPrices),
  ]);

  const sortedDates = Array.from(allDates).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  sortedDates.forEach(date => {
    sortedTransactions
      .filter(t => t.date === date)
      .forEach(transaction => {
        if (transaction.action === 'B') {
          currentShares += transaction.quantity;
        } else if (transaction.action === 'S') {
          currentShares -= transaction.quantity;
        }
      });

    const stockPrice = formattedStockPrices[date];
    if (stockPrice !== undefined && currentShares > 0) {
      portfolioValues.push({
        date,
        value: currentShares * stockPrice,
      });
    }
  });

  return portfolioValues;
};

const PortfolioValueChart: React.FC = () => {
  const theme = useTheme();
  const [portfolioData, setPortfolioData] = useState<PortfolioValueData[]>([]);
  const [stockPrices, setStockPrices] = useState<StockPriceData | null>(null);

  const stockToTransactions: { [symbol: string]: Transaction[] } = {
    GOOGL: [
      {
        action: 'B',
        date: '2021-01-04',
        positionAveragePrice: null,
        price: 86.31,
        quantity: 5,
      },
      {
        action: 'B',
        date: '2022-01-04',
        positionAveragePrice: null,
        price: 144.4,
        quantity: 5,
      },
      {
        action: 'S',
        date: '2023-07-26',
        positionAveragePrice: 115.355,
        price: 129.27,
        quantity: 5,
      },
    ],
  };

  useEffect(() => {
    const fetchStockPrices = async () => {
      try {
        const response = await fetch('/data/Graph.json');
        if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
        const data: StockPriceData = await response.json();
        setStockPrices(data);
      } catch (error) {
        console.error('Error fetching stock prices:', error);
      }
    };

    fetchStockPrices();
  }, []);

  useEffect(() => {
    if (stockPrices) {
      // Calculate portfolio value once stock prices are loaded
      const portfolioValues = calculatePortfolioValue(
        stockToTransactions['GOOGL'],
        stockPrices
      );
      setPortfolioData(portfolioValues);
    }
  }, [stockPrices]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={portfolioData}
        margin={{
          top: 16,
          right: 16,
          bottom: 0,
          left: 24,
        }}
      >
        <XAxis
          dataKey="date"
          stroke={theme.palette.text.secondary}
          style={theme.typography.body2}
        />
        <YAxis
          stroke={theme.palette.text.secondary}
          style={theme.typography.body2}
        >
          <Label
            angle={270}
            position="left"
            style={{
              textAnchor: 'middle',
              fill: theme.palette.text.primary,
              ...theme.typography.body1,
            }}
          >
            Portfolio Value ($)
          </Label>
        </YAxis>
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Portfolio Value']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={theme.palette.primary.main}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PortfolioValueChart;

