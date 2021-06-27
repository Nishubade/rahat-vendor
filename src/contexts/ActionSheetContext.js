import React, { createContext, useState } from 'react';

const initialState = {
	loading: null
};

export const ActionSheetContext = createContext(initialState);
export const ActionSheetContextProvider = ({ children }) => {
	const [state, setState] = useState(initialState);
	const [data, updateData] = useState({});

	const showLoading = msg => {
		setState({ ...state, loading: msg });
	};

	const setData = newData => {
		return updateData(Object.assign({}, data, newData));
	};

	const initData = defaultData => {
		let newData = Object.assign({}, defaultData);
		updateData(newData);
		return newData;
	};

	return (
		<ActionSheetContext.Provider
			value={{
				loading: state.loading,
				data,
				setData,
				initData,
				showLoading
			}}
		>
			{children}
		</ActionSheetContext.Provider>
	);
};
