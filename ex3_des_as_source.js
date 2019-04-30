const { Keypair, Operation, Server, TransactionBuilder, Network, Asset, TimeoutInfinite, Memo, MemoText } = require('stellar-sdk')

const horizonUrl = 'https://horizon-testnet.stellar.org'
Network.useTestNetwork()
const server = new Server(horizonUrl)
const engine = require('./engine')(server)

const distributeXlm = async (masterAccount, amount, ...walletAccounts) => {
  console.log('distribute xlm')

  const transferFunc = async (master, destinationPublic, asset, amount) => {
    console.log('transfer', asset.code)
    let account = await server.loadAccount(destinationPublic)

    let transaction = new TransactionBuilder(account, { fee: 100 })
      .addOperation(
        Operation.payment({
          source: master.publicKey(),
          amount: `${amount}`,
          asset: asset,
          destination: destinationPublic,
        })
      )
      .addOperation(
        Operation.payment({
          source: master.publicKey(),
          amount: `${2*0.00001}`,
          asset: asset,
          destination: destinationPublic,
        })
      )
      .addMemo(Memo.text(`${Date.now()}`))
      .setTimeout(TimeoutInfinite)
      .build()

    transaction.sign(master)
    return server.submitTransaction(transaction)
  }

  txs = walletAccounts.map(w => transferFunc(masterAccount, w.publicKey(), Asset.native(), amount))
  await Promise.all(txs)
}

const start = async () => {
  console.log('example 3 - receiver as source')
  const godAccount = Keypair.random()
  const masterAccount = Keypair.random()
  const walletCount = 5
  const wallets = Array.from(Array(walletCount)).map(a => Keypair.random())
  engine.printAccount(godAccount, 'G O D')
  engine.printAccount(masterAccount, 'master')
  wallets.forEach((a, i) => engine.printAccount(a, `wallet${i}`))

  await engine.initAccountWithFriendBot(godAccount.publicKey())
  await engine.createAccounts(godAccount, 2, masterAccount)
  await engine.transferNative(godAccount, masterAccount.publicKey(), 20)
  await engine.createAccountsWithSigner(masterAccount, 2, ...wallets)

  await engine.showBalance(masterAccount.publicKey())
  await distributeXlm(masterAccount, 2, ...wallets)
  await engine.showBalance(masterAccount.publicKey())
}

start()
  .then(_ => console.log('D O N E'))
  .catch(engine.printError)
