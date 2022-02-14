import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useHistory, Redirect, Link } from 'react-router-dom';
import { Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useResize } from '../../utils/react-utils';
import { isOffline } from '../../utils';
import { AppContext } from '../../contexts/AppContext';
import TransactionList from '../transactions/list';
import DataService from '../../services/db';
import ActionSheet from '../../actionsheets/sheets/ActionSheet';
import { ERC1155_Service, TokenService } from '../../services/chain';
import Loading from '../global/Loading';
import { IoArrowDownCircleOutline } from 'react-icons/io5';
import { calculateTotalPackageBalance } from '../../services';
import useAuthSignature from '../../hooks/useSignature';

var QRCode = require('qrcode.react');

export default function Main() {
	const history = useHistory();
	const { hasWallet, wallet, tokenBalance, setTokenBalance, agency, hasBackedUp, contextLoading, hasSynchronized } =
		useContext(AppContext);
	const authSign = useAuthSignature(wallet);
	const [redeemModal, setRedeemModal] = useState(false);
	const [redeemAmount, setRedeemAmount] = useState('');
	const [loading, showLoading] = useState(null);
	const [packageBalanceLoading, setPackageBalanceLoading] = useState(true);
	const [packageBalance, setPackageBalance] = useState(null);
	const [recentTx, setRecentTx] = useState(null);

	const cardBody = useRef();
	const { width } = useResize(cardBody);

	const calcQRWidth = () => {
		if (width < 200) return 200;
		else return 280;
	};

	const checkRecentTnx = useCallback(async () => {
		let txs = await DataService.listTx();
		if (txs && Array.isArray(txs)) {
			const arr = txs.slice(0, 3);
			setRecentTx(arr);
		}
	}, []);

	const getTokenBalance = useCallback(async () => {
		if (!agency) return;
		try {
			const balance = await TokenService(agency.address).getBalance();
			setTokenBalance(balance.toNumber());
		} catch (err) {
			console.log('Unable to get token Balance');
			console.log(err);
		}
	}, [agency, setTokenBalance]);

	const getPackageBalance = useCallback(async () => {
		if (!agency) return;
		if (!authSign) return;
		setPackageBalanceLoading(true);
		try {
			const nfts = await DataService.listNft();
			const walletAddress = await DataService.getAddress();
			// Get Token Ids from index db
			const tokenIds = nfts.map(item => item?.tokenId);
			if (!tokenIds?.length) return;

			const tokenQtys = [];

			// get token balances from contract
			const address = tokenIds.map(() => walletAddress);
			const blnc = await ERC1155_Service(agency?.address).getBatchBalance(address, tokenIds);

			if (!blnc) return;
			if (blnc?.length) {
				blnc.map(item => tokenQtys.push(item.toNumber()));
			}

			// get total-package-balance from Backend server
			const totalNftBalance = await calculateTotalPackageBalance({ tokenIds, tokenQtys }, authSign);
			setPackageBalance(totalNftBalance);
			setPackageBalanceLoading(false);
			// let tokens
		} catch (err) {
			setPackageBalanceLoading(false);
			console.log('Unable to get package balance', err);
		}
	}, [agency, authSign]);

	// const checkVendorStatus = async () => {
	// 	if (!wallet) return;
	// 	let data = await fetch(`${process.env.REACT_APP_DEFAULT_AGENCY_API}/vendors/${wallet.address}`).then(r => {
	// 		if (!r.ok) throw Error(r.message);
	// 		return r.json();
	// 	});

	// 	if (!data.agencies.length) return history.push('/setup/idcard');
	// 	let status = data.agencies[0].status;

	// 	if (status !== 'active') {
	// 		let dagency = Object.assign(agency, { isApproved: false });
	// 		await DataService.updateAgency(dagency.address, dagency);
	// 		history.push('/setup/pending');
	// 	}
	// };

	const confirmAndRedeemToken = async data => {
		setRedeemModal(false);
		const isConfirm = await Swal.fire({
			title: 'Are you sure?',
			html: `You are sending <b>${redeemAmount}</b> token to redeem it for cash`,
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#d33',
			confirmButtonText: 'Yes',
			cancelButtonText: 'No'
		});
		if (isConfirm.value) {
			redeemToken();
		} else {
			resetFormStates();
		}
	};

	const redeemToken = async () => {
		//TODO choose a financial institute to redeem token
		let tknService = TokenService(agency.address, wallet);
		showLoading('Transferring tokens to redeem. Please wait...');
		let receipt = await tknService.transfer(agency.adminAddress, Number(redeemAmount));
		resetFormStates();
		const tx = {
			hash: receipt.transactionHash,
			type: 'redeem',
			timestamp: Date.now(),
			amount: redeemAmount,
			to: 'agency',
			from: wallet.address,
			status: 'success'
		};
		await DataService.addTx(tx);
		await getTokenBalance();
		history.push(`/tx/${receipt.transactionHash}`);
	};

	const updateRedeemAmount = e => {
		let formData = new FormData(e.target.form);
		let data = {};
		formData.forEach((value, key) => (data[key] = value));
		setRedeemAmount(data.redeemAmount);
	};

	const resetFormStates = () => {
		showLoading(null);
		setRedeemAmount('');
		setRedeemModal(false);
	};

	const getInfoState = useCallback(async () => {
		if (contextLoading) return;
		if (!hasWallet) return history.push('/setup');
		if (!hasBackedUp) return history.push('/wallet/backup');
		if (!hasSynchronized) return history.push('/sync');
		if (agency && !agency.isApproved) return history.push('/setup/pending');
		await checkRecentTnx();
		await getTokenBalance();
		await getPackageBalance();
	}, [
		contextLoading,
		agency,
		hasSynchronized,
		hasWallet,
		hasBackedUp,
		history,
		getTokenBalance,
		checkRecentTnx,
		getPackageBalance
	]);

	useEffect(() => {
		let isMounted = true;
		if (isMounted) getInfoState();
		return () => {
			isMounted = false;
		};
	}, [getInfoState]);

	return (
		<>
			{contextLoading && (
				<div id="loader">
					<img src="/assets/img/brand/icon-white-128.png" alt="icon" className="loading-icon" />
				</div>
			)}
			<Loading showModal={loading !== null} message={loading} />
			<ActionSheet
				title="Redeem Token"
				buttonName="Redeem"
				showModal={redeemModal}
				onHide={() => setRedeemModal(false)}
				handleSubmit={confirmAndRedeemToken}
			>
				<div className="form-group basic">
					<div className="input-wrapper">
						<label className="label">Enter Amount</label>
						<div className="input-group mb-3">
							<div className="input-group-prepend">
								<span className="input-group-text" id="input14">
									Rs.
								</span>
							</div>
							<Form.Control
								type="number"
								name="redeemAmount"
								className="form-control"
								placeholder="Redeem"
								value={redeemAmount}
								onChange={updateRedeemAmount}
								required
							/>
							{/* <input type="number" className="form-control" id="text11" placeholder="Enter OTP" /> */}
							<i className="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>
				</div>
			</ActionSheet>

			<div id="appCapsule">
				<div className="section wallet-card-section pt-1">
					<div className="wallet-card">
						<div className="balance">
							<div className="left">
								<span className="title">Token Balance</span>
								<h1 className={`total `}>{tokenBalance || 0}</h1>
							</div>
							<div className="right">
								<span className="title">Package Balance</span>

								<h1 className={`total ${packageBalanceLoading && 'loading_text'}`}>
									NRS {packageBalance?.grandTotal || 0}
								</h1>
							</div>
						</div>
						{wallet && (
							<button
								className="item button-link"
								onClick={() => {
									if (isOffline()) return;
									setRedeemModal(true);
								}}
							>
								<div className="col">
									<div className="action-button">
										<IoArrowDownCircleOutline className="ion-icon" style={{ fontSize: '40px' }} />
									</div>
								</div>
								<strong>Redeem</strong>
							</button>
						)}
					</div>
				</div>

				<div className="section mt-2">
					<div className="card">
						<div
							className="section-heading"
							style={{
								marginBottom: '0px'
							}}
						>
							<div
								className="card-header"
								style={{
									borderBottom: '0px'
								}}
							>
								Recent Transactions
							</div>

							<Link to="/transaction" className="link" style={{ marginRight: '16px' }}>
								View All
							</Link>
						</div>
						<div
							className="card-body"
							style={{
								paddingTop: '0px'
							}}
						>
							<TransactionList limit="3" transactions={recentTx || []} />
						</div>
					</div>
				</div>

				{wallet && (
					<div className="section mt-2 mb-4">
						<div className="card text-center">
							<div className="card-header">Your Address</div>
							<div className="card-body">
								<div className="card-text" ref={cardBody}>
									<QRCode value={wallet.address} size={calcQRWidth()} />
									<div className="mt-1" style={{ fontSize: 13 }}>
										{wallet.address}
									</div>
									<div className="mt-2" style={{ fontSize: 9, lineHeight: 1.5 }}>
										This QR Code (address) is your unique identity. Use this to receive digital
										documents, assets or verify your identity.
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="text-center mt-4">
					{hasWallet && !wallet && <strong>Tap on lock icon to unlock</strong>}
				</div>
			</div>
		</>
	);
}
