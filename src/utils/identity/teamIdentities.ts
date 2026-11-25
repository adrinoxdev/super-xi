import type { TeamIdentity } from '@/types'

// GERADO por script (Node, fora de src). Identidades configuradas e estaveis; dado estatico, nao entra no save.
type P = TeamIdentity['pattern']
type O = TeamIdentity['orientation']
type S = TeamIdentity['shape']
const I = (shortName: string, shape: S, primaryColor: string, secondaryColor: string, pattern: P, orientation: O, stripes: number, textColor: string): TeamIdentity => ({
  shortName, shape, primaryColor, secondaryColor, pattern, orientation, stripes, textColor
})

export const TEAM_IDENTITIES: Record<string, TeamIdentity> = {
  d_1: I('SER', 'chanfrado', '#d59d26', '#183a8a', 'metade', 'diagonal-direita', 5, '#ffffff'),
  d_2: I('RIO', 'portugues', '#4ab4ec', '#294594', 'faixa', 'diagonal-esquerda', 3, '#ffffff'),
  d_3: I('LUS', 'frances', '#1c3487', '#f0f6f4', 'metade', 'diagonal-direita', 7, '#ffffff'),
  d_4: I('POU', 'medalhao', '#263f91', '#f7fcff', 'listras', 'vertical', 3, '#ffffff'),
  d_5: I('SAN', 'portugues', '#1d823f', '#ffffff', 'listras', 'vertical', 7, '#0f172a'),
  d_6: I('PLA', 'coracao', '#d31c67', '#11171e', 'faixa', 'diagonal-esquerda', 3, '#ffffff'),
  d_7: I('MAN', 'chanfrado', '#16803a', '#ebbe0e', 'listras', 'vertical', 7, '#ffffff'),
  d_8: I('TAB', 'losango', '#d93333', '#151c21', 'xadrez', 'vertical', 5, '#ffffff'),
  d_9: I('JAG', 'oval', '#ef6415', '#101919', 'metade', 'diagonal-esquerda', 3, '#ffffff'),
  d_10: I('PAM', 'pergaminho', '#771322', '#4badee', 'listras', 'diagonal-direita', 7, '#ffffff'),
  d_11: I('PIN', 'frances', '#8ad218', '#161b22', 'faixa', 'diagonal-direita', 5, '#ffffff'),
  d_12: I('IGU', 'coracao', '#127a3b', '#cf9c1e', 'liso', 'diagonal-direita', 3, '#ffffff'),
  d_13: I('GOI', 'ombros', '#223c90', '#fefcff', 'liso', 'diagonal-direita', 7, '#ffffff'),
  d_14: I('RIA', 'pergaminho', '#e65809', '#1646d3', 'faixa', 'horizontal', 3, '#ffffff'),
  d_15: I('OEI', 'ombros', '#e15307', '#fcffff', 'faixa', 'vertical', 7, '#0f172a'),
  d_16: I('SET', 'frances', '#1e53dc', '#fbf7fc', 'metade', 'vertical', 5, '#ffffff'),
  d_17: I('RET', 'portugues', '#6b2cbf', '#ffd021', 'metade', 'vertical', 7, '#ffffff'),
  d_18: I('LUA', 'oval', '#19813b', '#ffffff', 'faixa', 'diagonal-esquerda', 5, '#0f172a'),
  d_19: I('PEN', 'chanfrado', '#5a1126', '#c38c13', 'metade', 'vertical', 3, '#ffffff'),
  c_1: I('TAP', 'oval', '#1b8a44', '#edf5f3', 'listras', 'horizontal', 7, '#0f172a'),
  c_2: I('RIB', 'medalhao', '#fcc81b', '#12171c', 'listras', 'diagonal-esquerda', 5, '#ffffff'),
  c_3: I('BAR', 'oval', '#ef6218', '#ffffff', 'metade', 'diagonal-direita', 3, '#0f172a'),
  c_4: I('ARA', 'frances', '#0c7632', '#fcc81c', 'faixa', 'diagonal-direita', 7, '#ffffff'),
  c_5: I('GUA', 'frances', '#0d752e', '#ca9018', 'listras', 'horizontal', 7, '#ffffff'),
  c_6: I('BRR', 'oval', '#651e2f', '#d49d1e', 'metade', 'diagonal-esquerda', 5, '#ffffff'),
  c_7: I('CAI', 'brasao', '#89d523', '#070e15', 'metade', 'vertical', 3, '#ffffff'),
  c_8: I('VLA', 'pergaminho', '#3d6314', '#edd3a5', 'metade', 'horizontal', 3, '#ffffff'),
  c_9: I('SDL', 'portugues', '#cc2326', '#151c20', 'metade', 'diagonal-direita', 7, '#ffffff'),
  c_10: I('SRR', 'coracao', '#2055db', '#e9f0ee', 'metade', 'vertical', 5, '#ffffff'),
  c_11: I('EAG', 'oval', '#862736', '#4faeee', 'listras', 'vertical', 3, '#ffffff'),
  c_12: I('EST', 'chanfrado', '#1c3b8d', '#ffcf20', 'xadrez', 'vertical', 5, '#ffffff'),
  c_13: I('TOM', 'oval', '#0b131a', '#d0951b', 'metade', 'diagonal-esquerda', 5, '#ffffff'),
  c_14: I('ALI', 'portugues', '#c62021', '#111a1f', 'liso', 'diagonal-direita', 3, '#ffffff'),
  c_15: I('FLO', 'coracao', '#18833e', '#eebd0f', 'listras', 'horizontal', 5, '#ffffff'),
  c_16: I('MAR', 'oval', '#0e9789', '#fdfeff', 'faixa', 'horizontal', 7, '#0f172a'),
  c_17: I('SRM', 'frances', '#d02825', '#fcfaff', 'metade', 'horizontal', 5, '#ffffff'),
  c_18: I('AUR', 'chanfrado', '#cf1a63', '#fbfbfd', 'metade', 'diagonal-esquerda', 7, '#ffffff'),
  c_19: I('TRI', 'ombros', '#0a1116', '#cb971f', 'liso', 'vertical', 7, '#ffffff'),
  b_1: I('POR', 'chanfrado', '#0b9685', '#fbfaff', 'metade', 'diagonal-direita', 7, '#0f172a'),
  b_2: I('CAP', 'pergaminho', '#177a36', '#cc981c', 'liso', 'horizontal', 5, '#ffffff'),
  b_3: I('JAN', 'ombros', '#109386', '#f3f4f2', 'metade', 'vertical', 3, '#0f172a'),
  b_4: I('PNH', 'losango', '#783cce', '#f9ce1c', 'faixa', 'diagonal-esquerda', 7, '#ffffff'),
  b_5: I('CER', 'losango', '#117c3d', '#f9fdff', 'metade', 'diagonal-esquerda', 7, '#0f172a'),
  b_6: I('SAB', 'ombros', '#581624', '#c69616', 'faixa', 'horizontal', 7, '#ffffff'),
  b_7: I('ILH', 'brasao', '#1b212a', '#cc9920', 'faixa', 'vertical', 5, '#ffffff'),
  b_8: I('VIL', 'medalhao', '#e0352e', '#121921', 'listras', 'diagonal-direita', 7, '#ffffff'),
  b_9: I('MIR', 'chanfrado', '#0f978c', '#26438e', 'listras', 'vertical', 5, '#ffffff'),
  b_10: I('VSO', 'chanfrado', '#19823c', '#14141c', 'metade', 'vertical', 3, '#ffffff'),
  b_11: I('BAN', 'portugues', '#ce241f', '#1a2323', 'listras', 'vertical', 5, '#ffffff'),
  b_12: I('MOG', 'brasao', '#151b21', '#fcffff', 'faixa', 'diagonal-esquerda', 3, '#ffffff'),
  b_13: I('ALA', 'frances', '#1f2626', '#d49c22', 'liso', 'diagonal-esquerda', 7, '#ffffff'),
  b_14: I('PCE', 'losango', '#107f33', '#f4c217', 'metade', 'diagonal-direita', 5, '#ffffff'),
  b_15: I('GJR', 'coracao', '#5e152e', '#c99015', 'listras', 'diagonal-direita', 7, '#ffffff'),
  b_16: I('POE', 'losango', '#d3282b', '#100c14', 'listras', 'vertical', 3, '#ffffff'),
  b_17: I('SEL', 'medalhao', '#14813a', '#f6c61d', 'faixa', 'diagonal-direita', 5, '#ffffff'),
  b_18: I('CAM', 'coracao', '#1950d6', '#fccf25', 'xadrez', 'vertical', 3, '#ffffff'),
  b_19: I('ITU', 'brasao', '#1244cb', '#efeef7', 'listras', 'vertical', 3, '#ffffff'),
  a_1: I('SOB', 'ombros', '#6931c4', '#bd8a10', 'listras', 'vertical', 3, '#ffffff'),
  a_2: I('ESM', 'medalhao', '#0f996a', '#f1eff2', 'metade', 'horizontal', 7, '#0f172a'),
  a_3: I('SOL', 'losango', '#ea5b0b', '#fcce1c', 'metade', 'horizontal', 7, '#0f172a'),
  a_4: I('MON', 'medalhao', '#681d32', '#cb9722', 'listras', 'horizontal', 7, '#ffffff'),
  a_5: I('PMP', 'oval', '#d52469', '#191d24', 'liso', 'horizontal', 7, '#ffffff'),
  a_6: I('BND', 'chanfrado', '#811e30', '#47b1eb', 'listras', 'vertical', 7, '#ffffff'),
  a_7: I('CPO', 'oval', '#0f9183', '#eef2f1', 'xadrez', 'vertical', 3, '#0f172a'),
  a_8: I('MER', 'brasao', '#4baef0', '#811a29', 'metade', 'horizontal', 5, '#ffffff'),
  a_9: I('MIN', 'chanfrado', '#49b2ed', '#eef2f3', 'faixa', 'horizontal', 5, '#0f172a'),
  a_10: I('MUC', 'medalhao', '#591326', '#be8e0d', 'metade', 'diagonal-esquerda', 7, '#ffffff'),
  a_11: I('REC', 'coracao', '#771627', '#ebf1f4', 'listras', 'vertical', 7, '#ffffff'),
  a_12: I('TAT', 'coracao', '#83c516', '#091319', 'faixa', 'diagonal-direita', 7, '#ffffff'),
  a_13: I('CAR', 'frances', '#fcffff', '#2053df', 'liso', 'diagonal-esquerda', 5, '#0f172a'),
  a_14: I('VEN', 'medalhao', '#129589', '#10161d', 'metade', 'diagonal-esquerda', 7, '#ffffff'),
  a_15: I('ALT', 'portugues', '#55bbf3', '#7a1c2a', 'listras', 'vertical', 5, '#ffffff'),
  a_16: I('BAA', 'chanfrado', '#fbf8fd', '#1e378b', 'listras', 'vertical', 3, '#ffffff'),
  a_17: I('VAL', 'brasao', '#248744', '#fbca23', 'liso', 'diagonal-direita', 7, '#ffffff'),
  a_18: I('CRV', 'portugues', '#0f1515', '#656b7a', 'listras', 'vertical', 3, '#ffffff'),
  a_19: I('PAN', 'chanfrado', '#d83430', '#0b1219', 'faixa', 'diagonal-esquerda', 7, '#ffffff'),
  con_1: I('RDU', 'frances', '#54b5f1', '#1b3787', 'listras', 'vertical', 5, '#ffffff'),
  con_2: I('PUE', 'losango', '#2757dc', '#eceff5', 'xadrez', 'vertical', 3, '#ffffff'),
  con_3: I('SPO', 'medalhao', '#0e0f19', '#6d7a84', 'xadrez', 'vertical', 7, '#ffffff'),
  con_4: I('PAO', 'oval', '#38620c', '#e9d7a6', 'listras', 'vertical', 3, '#ffffff'),
  con_5: I('AAL', 'portugues', '#781a23', '#c99116', 'listras', 'vertical', 5, '#ffffff'),
  con_6: I('VVE', 'oval', '#147d3a', '#f1c016', 'listras', 'diagonal-direita', 5, '#ffffff'),
  con_7: I('COS', 'brasao', '#058d7a', '#f5fcfb', 'liso', 'vertical', 3, '#ffffff'),
  con_8: I('PEH', 'frances', '#882731', '#ca9b1a', 'metade', 'horizontal', 3, '#ffffff'),
  ext_esporte_clube_ipe_roxo: I('IPE', 'chanfrado', '#6c35c9', '#f2eff2', 'listras', 'vertical', 7, '#ffffff'),
  ext_atletico_serra_azul: I('SAZ', 'medalhao', '#2450da', '#fcffff', 'faixa', 'diagonal-esquerda', 3, '#0f172a'),
  ext_sociedade_esportiva_vale_do_ipe: I('VIP', 'brasao', '#fece22', '#6f39c8', 'listras', 'vertical', 7, '#ffffff'),
  ext_sport_clube_reconcavo: I('RCN', 'pergaminho', '#882433', '#eff2ef', 'metade', 'diagonal-direita', 3, '#ffffff'),
  ext_associacao_atletica_planalto: I('PLN', 'ombros', '#f9c71b', '#12111a', 'faixa', 'vertical', 5, '#ffffff'),
  ext_uniao_esportiva_marajo: I('MRJ', 'pergaminho', '#d12626', '#f7ca17', 'xadrez', 'vertical', 5, '#ffffff'),
  ext_clube_atletico_tapajos: I('TPJ', 'medalhao', '#16813f', '#fdfeff', 'listras', 'vertical', 7, '#0f172a'),
  ext_esporte_clube_estrela_do_norte: I('STR', 'medalhao', '#1f3585', '#f0bd16', 'xadrez', 'vertical', 3, '#ffffff'),
  ext_deportivo_costa_dourada: I('CDO', 'losango', '#be8a0e', '#253c90', 'xadrez', 'vertical', 5, '#ffffff'),
  ext_associacao_recanto_do_sul: I('REO', 'losango', '#8ad31c', '#224495', 'listras', 'vertical', 5, '#ffffff'),
  dx_1: I('AUA', 'brasao', '#6324bc', '#ffffff', 'metade', 'horizontal', 5, '#ffffff'),
  dx_2: I('CAN', 'oval', '#147a39', '#c79615', 'faixa', 'diagonal-direita', 5, '#ffffff'),
  dx_3: I('TAQ', 'ombros', '#1a1e25', '#eef3f2', 'listras', 'vertical', 7, '#ffffff'),
  dx_4: I('CAZ', 'chanfrado', '#2253e0', '#f9cb19', 'xadrez', 'vertical', 5, '#ffffff'),
  dx_5: I('JAC', 'ombros', '#6629c0', '#5dbefa', 'metade', 'diagonal-direita', 5, '#ffffff'),
  dx_6: I('IPU', 'oval', '#d4206e', '#edf2f4', 'listras', 'diagonal-direita', 7, '#ffffff'),
  dx_7: I('ARO', 'frances', '#335605', '#eeeef4', 'liso', 'diagonal-direita', 3, '#ffffff'),
  dx_8: I('LAG', 'coracao', '#d52928', '#feffff', 'liso', 'diagonal-direita', 5, '#ffffff'),
  dx_9: I('MOR', 'coracao', '#e1332e', '#f3f5f5', 'listras', 'vertical', 7, '#0f172a'),
  dx_10: I('BUR', 'pergaminho', '#ffd225', '#34520a', 'xadrez', 'vertical', 3, '#ffffff'),
  dx_11: I('CAC', 'losango', '#101418', '#f2f7fb', 'listras', 'horizontal', 3, '#ffffff'),
  dx_12: I('SRN', 'coracao', '#2257dc', '#f0f7f5', 'listras', 'vertical', 5, '#ffffff'),
  dx_13: I('PIR', 'frances', '#8dd022', '#171722', 'xadrez', 'vertical', 7, '#ffffff'),
  dx_14: I('VER', 'coracao', '#821e33', '#4eaff2', 'liso', 'diagonal-direita', 7, '#ffffff'),
  dx_15: I('CAD', 'chanfrado', '#c08d0e', '#097234', 'faixa', 'vertical', 5, '#ffffff'),
  dx_16: I('BVE', 'coracao', '#d32923', '#17317d', 'listras', 'vertical', 3, '#ffffff'),
  dx_17: I('MRC', 'ombros', '#f8ce20', '#1e48d7', 'metade', 'diagonal-esquerda', 3, '#ffffff'),
  dx_18: I('SUC', 'ombros', '#0e9369', '#e7bb0d', 'faixa', 'diagonal-esquerda', 5, '#ffffff'),
  dx_19: I('JUR', 'portugues', '#0a1318', '#c69112', 'metade', 'vertical', 7, '#ffffff'),
  dx_20: I('CRN', 'medalhao', '#16853a', '#f2dba8', 'listras', 'diagonal-direita', 3, '#ffffff'),
  dx_21: I('GMI', 'pergaminho', '#edbf0c', '#1247cd', 'xadrez', 'vertical', 7, '#ffffff'),
  dx_22: I('PED', 'pergaminho', '#6c7789', '#f7fbfd', 'listras', 'diagonal-esquerda', 5, '#0f172a'),
  dx_23: I('TAM', 'brasao', '#163083', '#ca2221', 'metade', 'horizontal', 5, '#ffffff'),
  dx_24: I('RSE', 'coracao', '#e4d1a0', '#50111b', 'listras', 'vertical', 7, '#ffffff'),
  dx_25: I('BAB', 'pergaminho', '#e95d0f', '#f3eff8', 'faixa', 'diagonal-direita', 5, '#0f172a'),
  dx_26: I('ANG', 'chanfrado', '#25222e', '#d2a22a', 'faixa', 'horizontal', 5, '#ffffff'),
  dx_27: I('SFA', 'oval', '#0d0913', '#ec5d0f', 'listras', 'vertical', 3, '#ffffff'),
  dx_28: I('BAC', 'portugues', '#172121', '#f25c10', 'liso', 'diagonal-direita', 3, '#ffffff'),
  dx_29: I('CRB', 'coracao', '#d72f2c', '#fcffff', 'metade', 'vertical', 7, '#0f172a'),
  dx_30: I('PAU', 'portugues', '#426113', '#dccf98', 'faixa', 'horizontal', 7, '#ffffff'),
  dx_31: I('LAJ', 'medalhao', '#93d41e', '#0f1419', 'xadrez', 'vertical', 7, '#ffffff'),
  dx_32: I('TUC', 'oval', '#067033', '#f5691b', 'metade', 'diagonal-direita', 7, '#ffffff'),
  dx_33: I('MND', 'chanfrado', '#32560c', '#e3307c', 'metade', 'vertical', 7, '#ffffff'),
  dx_34: I('VAR', 'pergaminho', '#0c0f19', '#e8eff3', 'faixa', 'horizontal', 3, '#ffffff'),
  dx_35: I('CHA', 'pergaminho', '#d2272f', '#e8eaed', 'xadrez', 'vertical', 5, '#ffffff'),
  dx_36: I('CAJ', 'losango', '#f56a1d', '#0e702d', 'faixa', 'vertical', 3, '#ffffff'),
  dx_37: I('PIT', 'oval', '#087131', '#090912', 'listras', 'vertical', 7, '#ffffff'),
  dx_38: I('JAT', 'pergaminho', '#0f161b', '#e05200', 'faixa', 'vertical', 5, '#ffffff'),
  dx_39: I('COQ', 'chanfrado', '#f5f4fa', '#24388f', 'faixa', 'horizontal', 3, '#ffffff'),
  dx_40: I('RMA', 'medalhao', '#224492', '#eaf1f7', 'liso', 'horizontal', 7, '#ffffff'),
  dx_41: I('SIR', 'oval', '#3e5e13', '#e0ca94', 'liso', 'diagonal-esquerda', 5, '#ffffff'),
  dx_42: I('GRA', 'medalhao', '#58182c', '#f6f5fc', 'faixa', 'diagonal-direita', 5, '#ffffff'),
  dx_43: I('UMB', 'brasao', '#54b4f0', '#731124', 'faixa', 'diagonal-direita', 7, '#ffffff'),
  dx_44: I('TBC', 'brasao', '#d93431', '#f4f9fc', 'metade', 'vertical', 3, '#0f172a'),
  dx_45: I('RTC', 'losango', '#df5005', '#feffff', 'xadrez', 'vertical', 3, '#0f172a'),
  dx_46: I('GAM', 'portugues', '#19a877', '#fdcc1b', 'metade', 'vertical', 7, '#0f172a'),
}

/** Nome do time -> id (rivais sem id proprio recebem id derivado do nome). */
export const TEAM_ID_BY_NAME: Record<string, string> = {
  'Serra Dourada FC': 'd_1',
  'Rio Claro do Norte': 'd_2',
  'Lusitano de Vargem': 'd_3',
  'Pouso Fundo': 'd_4',
  'Nova Santa Rita': 'd_5',
  'Planaltina Real': 'd_6',
  'Mangabeira EC': 'd_7',
  'Tabuleiro EC': 'd_8',
  'Jaguatirica FC': 'd_9',
  'Pampeiro EC': 'd_10',
  'Pindorama Atlético': 'd_11',
  'Iguaçu do Sul': 'd_12',
  'Goianira FC': 'd_13',
  'Riachuelo-SE': 'd_14',
  'Oeiras Atlético': 'd_15',
  'Sete de Setembro-RS': 'd_16',
  'Clube do Retiro Novo': 'd_17',
  'Lua Nova EC': 'd_18',
  'Tupinambá EC': 'd_18', // alias do nome antigo (saves antigos)
  'Penedo Atlético': 'd_19',
  'Tapajós Esporte': 'c_1',
  'Ribeirinho AC': 'c_2',
  'Barra Velha EC': 'c_3',
  'Araucária Real': 'c_4',
  'Guaribas EC': 'c_5',
  'Barra do Sul FC': 'c_6',
  'Caiçara FC': 'c_7',
  'Via Láctea FC': 'c_8',
  'Ferrovia Paulista': 'c_8', // alias do nome antigo (saves antigos)
  'Serra do Luar': 'c_9',
  'São Bento do Vale': 'c_9', // alias do nome antigo (saves antigos)
  'Atlético Serrano': 'c_10',
  'Estrela do Agreste': 'c_11',
  'Esperança de Lagarto': 'c_11', // alias do nome antigo (saves antigos)
  'Estrela de Malta EC': 'c_12',
  'Tombo Velho': 'c_13',
  'Aliança Potiguar': 'c_14',
  'Florestal EC': 'c_15',
  'Maranhense do Cais': 'c_16',
  'Santa Rosa da Mata': 'c_17',
  'Aurora Capixaba': 'c_18',
  'Trilhos do Ceará': 'c_19',
  'Porto Praiano': 'b_1',
  'Capibaribe SC': 'b_2',
  'Jangadeiros FC': 'b_3',
  'Pinhais AC': 'b_4',
  'Cerrado Esporte': 'b_5',
  'Sabará Mineiro': 'b_6',
  'Ilhéu Catarinense': 'b_7',
  'Vila Hermínia': 'b_8',
  'Mirante Paulista': 'b_9',
  'Vale do Sol': 'b_10',
  'Noroeste do Vale': 'b_10', // alias do nome antigo (saves antigos)
  'Bandeirante de Campinas': 'b_11',
  'Mogiana Alvinegra': 'b_12',
  'Alagoano do Mar': 'b_13',
  'Pinhal Celeste': 'b_14',
  'Operário Araucário': 'b_14', // alias do nome antigo (saves antigos)
  'Guajará Esporte': 'b_15',
  'Poente FC': 'b_16',
  'Oeste Catarinense': 'b_16', // alias do nome antigo (saves antigos)
  'Selva Amazônica FC': 'b_17',
  'Camboriú Real': 'b_18',
  'Ituverava FC': 'b_19',
  'Soberano FC': 'a_1',
  'Esmeralda Paulista': 'a_2',
  'Sol Nascente EC': 'a_3',
  'Atlético Montanhês': 'a_4',
  'Pampa Sport Clube': 'a_5',
  'Bandeirantes FC': 'a_6',
  'Cais do Porto': 'a_7',
  'Meridiano AC': 'a_8',
  'Farroupilha AC': 'a_8', // alias do nome antigo (saves antigos)
  'Minas Celeste': 'a_9',
  'Mucuripe FC': 'a_10',
  'Recôncavo Atlético': 'a_11',
  'Tatuapé FC': 'a_12',
  'Caravela FC': 'a_13',
  'Ventania PR': 'a_14',
  'Alto Tietê FC': 'a_15',
  'Barra Nova EC': 'a_16',
  'Vale Verde EC': 'a_17',
  'Carvoeiro FC': 'a_18',
  'Pantanal Esporte': 'a_19',
  'Club Atlético Rio Dulce': 'con_1',
  'Deportivo Puerto Azul': 'con_2',
  'Club Sportivo Carbonero': 'con_3',
  'Unión Pampa Oriental': 'con_4',
  'Sociedad Altiplano Alto': 'con_5',
  'Atlético Valle Verde': 'con_6',
  'Ciudad Costanera FC': 'con_7',
  'Club Pehuén Andino': 'con_8',
  'Esporte Clube Ipê-Roxo': 'ext_esporte_clube_ipe_roxo',
  'Atlético Serra Azul': 'ext_atletico_serra_azul',
  'Sociedade Esportiva Vale do Ipê': 'ext_sociedade_esportiva_vale_do_ipe',
  'Sport Clube Recôncavo': 'ext_sport_clube_reconcavo',
  'Associação Atlética Planalto': 'ext_associacao_atletica_planalto',
  'União Esportiva Marajó': 'ext_uniao_esportiva_marajo',
  'Clube Atlético Tapajós': 'ext_clube_atletico_tapajos',
  'Esporte Clube Estrela do Norte': 'ext_esporte_clube_estrela_do_norte',
  'Deportivo Costa Dourada': 'ext_deportivo_costa_dourada',
  'Associação Recanto do Sul': 'ext_associacao_recanto_do_sul',
  'Arapuã EC': 'dx_1',
  'Canjerana FC': 'dx_2',
  'Taquaral do Oeste': 'dx_3',
  'Cerro Azul do Sertão': 'dx_4',
  'Jacarandá Atlético': 'dx_5',
  'Ipueiras FC': 'dx_6',
  'Aroeira Esporte': 'dx_7',
  'Lagoa Funda EC': 'dx_8',
  'Morro Alto FC': 'dx_9',
  'Buritizal AC': 'dx_10',
  'Cachoeira do Pombo': 'dx_11',
  'Seringal EC': 'dx_12',
  'Piracema FC': 'dx_13',
  'Vereda Grande EC': 'dx_14',
  'Capim Dourado EC': 'dx_15',
  'Barro Vermelho FC': 'dx_16',
  'Maracajá EC': 'dx_17',
  'Sucupira Atlético': 'dx_18',
  'Juriti FC': 'dx_19',
  'Carnaubal EC': 'dx_20',
  'Guará-Mirim FC': 'dx_21',
  'Pedra Lisa AC': 'dx_22',
  'Tamanduá EC': 'dx_23',
  'Riacho Seco FC': 'dx_24',
  'Babaçu do Norte': 'dx_25',
  'Angico Atlético': 'dx_26',
  'Serra do Facão FC': 'dx_27',
  'Bacuri FC': 'dx_28',
  'Caraíba EC': 'dx_29',
  'Pau-Ferro AC': 'dx_30',
  'Lajedo FC': 'dx_31',
  'Tucunaré EC': 'dx_32',
  'Mandacaru FC': 'dx_33',
  'Várzea Bonita EC': 'dx_34',
  'Chapada Alta FC': 'dx_35',
  'Cajueiro AC': 'dx_36',
  'Pitanga do Vale': 'dx_37',
  'Jatobá EC': 'dx_38',
  'Coqueiral FC': 'dx_39',
  'Ribeirão Manso': 'dx_40',
  'Siriema Atlético': 'dx_41',
  'Graúna FC': 'dx_42',
  'Umbuzeiro EC': 'dx_43',
  'Taboca FC': 'dx_44',
  'Araticum EC': 'dx_45',
  'Gameleira AC': 'dx_46',
}

const FALLBACK_SHAPES: S[] = ['portugues', 'frances', 'ombros', 'brasao', 'medalhao', 'oval', 'losango', 'coracao', 'pergaminho', 'chanfrado']
const FALLBACK_PAIRS: Array<[string, string]> = [
  ['#c62f2f', '#f4f6fa'], ['#1f4fc9', '#f2c21a'], ['#17803f', '#f4f6fa'], ['#7a1f2e', '#58b0e6'],
  ['#15191f', '#e8590c'], ['#1e3a8a', '#d12e2e'], ['#6b30c4', '#f2c21a'], ['#0f9488', '#1e3a8a']
]
const FALLBACK_PATTERNS: P[] = ['listras', 'faixa', 'metade', 'listras', 'xadrez']
const FALLBACK_ORIENTATIONS: O[] = ['vertical', 'horizontal', 'diagonal-esquerda', 'diagonal-direita']
const SIG_STOP = new Set(['DE', 'DO', 'DA', 'DOS', 'DAS', 'FC', 'EC', 'AC', 'SC'])

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function slugName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const fallbackCache = new Map<string, TeamIdentity>()

/** Fallback deterministico por hash do nome: mesmo nome, mesma identidade, sempre. */
function fallbackIdentity(name: string): TeamIdentity {
  const key = name.trim() || 'Time'
  const hit = fallbackCache.get(key)
  if (hit) return hit
  const h = hashString(key)
  const [primaryColor, secondaryColor] = FALLBACK_PAIRS[h % FALLBACK_PAIRS.length]
  const pattern = FALLBACK_PATTERNS[(h >>> 3) % FALLBACK_PATTERNS.length]
  const words = key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((w) => w && !SIG_STOP.has(w))
  const letters = (words.join('') + 'XXX').slice(0, 3)
  const id: TeamIdentity = {
    shortName: (words[0] ? words[0].slice(0, 3) : letters).padEnd(3, 'X'),
    shape: FALLBACK_SHAPES[(h >>> 6) % FALLBACK_SHAPES.length],
    primaryColor,
    secondaryColor,
    pattern,
    orientation: pattern === 'xadrez' ? 'vertical' : FALLBACK_ORIENTATIONS[(h >>> 9) % FALLBACK_ORIENTATIONS.length],
    stripes: [3, 5, 7][(h >>> 12) % 3]
  }
  fallbackCache.set(key, id)
  return id
}

/**
 * Identidade configurada de um time (por id ou nome). Nunca quebra: sem entrada, usa hash do nome.
 * O clube do usuario NAO passa por aqui; vem da store club (editavel).
 */
export function getTeamIdentity(idOrName: string | null | undefined): TeamIdentity {
  const key = (idOrName ?? '').trim()
  const byId = TEAM_IDENTITIES[key]
  if (byId) return byId
  const idFromName = TEAM_ID_BY_NAME[key] ?? 'ext_' + slugName(key)
  const byName = TEAM_IDENTITIES[idFromName]
  if (byName) return byName
  return fallbackIdentity(key)
}
