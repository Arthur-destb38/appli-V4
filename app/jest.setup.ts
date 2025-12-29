import '@testing-library/jest-native/extend-expect';

jest.mock('expo-sqlite', () => {
  const mockedDb = {
    transaction: (cb: (tx: any) => void) => {
      const tx = {
        executeSql: (_sql: string, _params: unknown[], success?: Function) => {
          success?.({ rows: { _array: [] }, insertId: 1 });
          return false;
        },
      };
      cb(tx);
    },
  };

  return {
    openDatabase: () => mockedDb,
    openDatabaseSync: () => mockedDb,
  };
});

jest.mock(
  'react-native-svg',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const MockSvg = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'mock-svg' }, children);
    return {
      __esModule: true,
      Svg: MockSvg,
      Polyline: MockSvg,
      Circle: MockSvg,
    };
  },
  { virtual: true }
);

jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    default: {
      expoGoConfig: null,
      manifest: null,
      manifest2: null,
    },
  };
});
