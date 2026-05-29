// ════════════════════════════════════════════
// 8. DADOS DE DEMO
// ════════════════════════════════════════════

/** Retorna arquivos de código com exemplos de todos os tipos de issues */
export function getDemoFiles() {
  return [
    {
      name: "src/api/userController.js",
      content: `
const db = require('./db');
async function getUser(req, res) {
  const userId = req.query.id;
  // TODO: add input validation
  const query = "SELECT * FROM users WHERE id = " + userId;
  const user  = await db.execute(query);
  res.json(user);
}
async function updateUser(req, res) {
  const { name, email, password } = req.body;
  const API_KEY = "sk-prod-abc123secret456789xyz";
  const token   = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.abc123";
  if (!name) {
    if (!email) {
      if (!password) {
        if (password.length < 8) {
          if (password.match(/[A-Z]/)) {
            if (password.match(/[0-9]/)) { /* deep nesting */ }
          }
        }
      }
    }
  }
  document.getElementById('userInfo').innerHTML = '<b>' + name + '</b>';
  try {
    await db.update({ name, email });
  } catch (e) {}
}
module.exports = { getUser, updateUser };`,
    },
    {
      name: "src/services/paymentService.py",
      content: `
import os, subprocess
password    = "super_secret_db_pass_2024"
stripe_key  = "sk_live_AbCdEfGhIjKlMnOpQrStUvWx"
def process_payment(user_id, amount, currency):
  # FIXME: remove debug prints
  print(f"Processing payment for user {user_id}")
  cmd = "process_payment --user " + user_id + " --amount " + str(amount)
  result = subprocess.call(cmd, shell=True)
  try:
    validate_amount(amount)
  except Exception:
    pass
  if amount > 1000:
    if currency == "BRL":
      if user_id:
        if result == 0:
          fee   = amount * 0.0345
          tax   = fee   * 0.17
          total = amount + fee + tax
  return result`,
    },
    {
      name: "src/utils/dataProcessor.ts",
      content: `
import axios from 'axios';
const SECRET_TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";
export async function fetchUserData(userId: string): Promise<any> {
  const url      = "https://api.example.com/users/" + userId;
  const response = await axios.get(url, { headers: { Authorization: SECRET_TOKEN } });
  const data     = eval(response.data.transform);
  const unusedVar       = response.data.extra;
  const anotherUnused   = computeSomething();
  // TODO: implement proper error handling
  // FIXME: this whole function needs refactoring
  return data;
}
async function computeSomething() {
  const result = 42 * 365 * 1440;
  if (result > 22118400) {
    console.log("Large computation:", result);
  }
  return result;
}`,
    },
    {
      name: "src/core/authService.go",
      content: `
package auth
import ("database/sql"; "fmt"; "os/exec")
const adminPassword = "admin1234"
const dbConnString  = "postgres://admin:password@localhost/prod"
func GetUser(db *sql.DB, username string) (*User, error) {
  query := fmt.Sprintf("SELECT * FROM users WHERE username = '%s'", username)
  row   := db.QueryRow(query)
  var user User
  err := row.Scan(&user.ID, &user.Name, &user.Email)
  if err != nil { return nil, err }
  return &user, nil
}
func RunReport(reportName string) error {
  cmd := exec.Command("sh", "-c", "run_report " + reportName)
  return cmd.Run()
}`,
    },
    {
      name: "src/utils/helpers.js",
      content: `
// Utilitários auxiliares — sem operações assíncronas reais
async function formatCurrency(value, currency) {
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  return formatted;
}
async function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}
// Bloco duplicado de cálculo de desconto (cópia de userController.js)
function applyDiscount(price, discountPct) {
  if (price <= 0) return 0;
  const discount = price * (discountPct / 100);
  const finalPrice = price - discount;
  const tax = finalPrice * 0.1;
  return finalPrice + tax;
}
function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}`,
    },
    {
      name: "src/api/orderController.js",
      content: `
const db = require('./db');
// TODO: adicionar autenticação
// FIXME: validar campos obrigatórios
function applyDiscount(price, discountPct) {
  if (price <= 0) return 0;
  const discount = price * (discountPct / 100);
  const finalPrice = price - discount;
  const tax = finalPrice * 0.1;
  return finalPrice + tax;
}
function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
async function createOrder(req, res) {
  const { userId, items } = req.body;
  const query = "INSERT INTO orders (user_id) VALUES (" + userId + ")";
  try {
    await db.execute(query);
  } catch (e) {}
  document.getElementById('orderStatus').innerHTML = '<b>' + userId + '</b>';
  res.json({ ok: true });
}
module.exports = { createOrder };`,
    },
  ];
}

/** Retorna o XML de demo do GeneXus (Sistema de Pedidos) */
export function getGXLDemoXML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<KnowledgeBase>
  <Procedure Name="P_ProcessOrder" Description="Processa pedidos de clientes">
    <Rules>If &amp;OrderId = 0\n  Msg("Order ID required") Error\nEndIf\nFor Each Order\n  Where OrderId = &amp;OrderId\n  If OrderStatus = 1\n    Call(P_CalculateTotal)\n    Call(P_SendNotification)\n    Do While &amp;Retry &lt; 3\n      Call(P_UpdateInventory)\n      &amp;Retry = &amp;Retry + 1\n    EndDo\n  EndIf\n  For Each OrderItem\n    Where OrderId = &amp;OrderId\n    &amp;Total = &amp;Total + ItemPrice * ItemQty\n  EndFor\n  Commit\n  Commit\nEndFor</Rules>
    <Variables><Var Name="OrderId" Type="Numeric"/><Var Name="Total" Type="Numeric"/></Variables>
  </Procedure>
  <Procedure Name="P_CalculateTotal" Description="">
    <Rules>For Each Order\n  &amp;Total = 0\n  For Each OrderItem\n    &amp;Total = &amp;Total + ItemPrice * ItemQty\n  EndFor\nEndFor</Rules>
  </Procedure>
  <Procedure Name="P_SendNotification" Description="Envia notificacao por email">
    <Rules>&amp;msg = "Ola " + &amp;Name\nudp(P_EmailSender)\n&amp;WebText.Caption = &amp;UserInput\nSubmit(P_GenerateReport)\n&amp;nTotal = TotalRelatorio</Rules>
  </Procedure>
  <Procedure Name="P_UpdateInventory" Description="">
    <Rules>For Each Product\n  Where ProductId = &amp;ProductId\n  ProductStock = ProductStock - &amp;Qty\n  If ProductStock &lt; 0\n    Msg("Insufficient") Error\n    Rollback\n  EndIf\nEndFor\nCommit</Rules>
  </Procedure>
  <Procedure Name="P_Login" Description="Autentica usuario no sistema">
    <Rules>&amp;password = "admin123"\nFor Each Usuario\n  Where UsuNome = &amp;login\n  If UsuSenha = &amp;password\n    &amp;ok = 1\n  EndIf\nEndFor\nCall(P_AuditLog) NoWait</Rules>
  </Procedure>
  <Procedure Name="P_OrphanProc" Description=""></Procedure>
  <WebPanel Name="WP_OrderEntry" Description="Tela de entrada de pedidos">
    <Events>Event Start\n  Call(P_LoadCustomers)\nEndEvent\nEvent &amp;BtnSave.Click\n  Call(P_ProcessOrder)\nEndEvent</Events>
  </WebPanel>
  <WebPanel Name="WP_UserList" Description="">
    <Events>Event Start\n  For Each Usuario\n    &amp;nome.Caption = UsuNome\n    For Each Pedido\n      Where PedUsuId = UsuId\n      &amp;count = &amp;count + 1\n    EndFor\n  EndFor\nEndEvent</Events>
  </WebPanel>
  <Transaction Name="T_Order" Description="Tabela de pedidos">
    <Attribute Name="OrderId" Type="Numeric" Size="9" IsKey="true" Nullable="false"/>
    <Attribute Name="CustomerId" Type="Numeric" Size="9"/>
    <Attribute Name="OrderDate" Type="Date"/>
    <Attribute Name="OrderStatus" Type="Numeric" Size="1"/>
    <Attribute Name="Total" Type="Numeric" Size="12"/>
    <Index Name="IxOrder_Customer"><IndexAttribute Name="CustomerId"/></Index>
  </Transaction>
  <Transaction Name="T_Customer" Description="Cadastro de clientes">
    <Attribute Name="CustomerId" Type="Numeric" Size="9" IsKey="true" Nullable="false"/>
    <Attribute Name="CustomerName" Type="Character" Size="100"/>
    <Attribute Name="CustomerEmail" Type="Character" Size="200"/>
  </Transaction>
  <Transaction Name="T_Config" Description="">
    <Attribute Name="ConfigKey" Type="Character" Size="50"/>
    <Attribute Name="ConfigValue" Type="Character" Size="200"/>
  </Transaction>
</KnowledgeBase>`;
}
