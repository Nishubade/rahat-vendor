import API from '../constants/api';
import axios from 'axios';

export async function registerToAgency(payload) {
	try {
		const res = await axios.post(`${API.REGISTER}`, JSON.stringify(payload), {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		});
		return { res: res.data };
	} catch (e) {
		throw Error(e);
	}
}

export async function getVendorByWallet(walletAddress) {
	try {
		const res = await axios.get(`${API.VENDORS}/${walletAddress}`);
		return res.data;
	} catch (err) {
		throw Error(err);
	}
}
export async function getPackageDetails(id) {
	try {
		const res = await axios.get(`${API.NFT}/token/${id}`);
		return res.data;
	} catch (e) {
		throw Error(e);
	}
}

export const getDefautAgency = async () => {
	let appData = await fetch(`${process.env.REACT_APP_DEFAULT_AGENCY_API}/app/settings`).then(async r => {
		if (!r.ok) throw Error(r.message);
		return r.json();
	});
	const agencyData = {
		api: process.env.REACT_APP_DEFAULT_AGENCY_API,
		address: appData.agency.contracts.rahat,
		adminAddress: appData.agency.contracts.rahat_admin,
		network: appData.networkUrl,
		tokenAddress: appData.agency.contracts.rahat_erc20,
		nftAddress: appData.agency.contracts.rahat_erc1155,
		name: appData.agency.name,
		email: appData.agency.email,
		isApproved: false
	};
	return agencyData;
};
export async function checkApproval(walletAddress) {
	try {
		const res = await axios.get(`${API.SERVER_URL}/vendors/0x${walletAddress}`);
		return res.data;
	} catch (e) {
		throw Error(e);
	}
}

export async function checkBeneficiary(phone) {
	try {
		const res = await axios.get(`${API.SERVER_URL}/beneficiaries/check/${phone}`);
		return res.data;
	} catch (e) {
		throw Error(e);
	}
}
