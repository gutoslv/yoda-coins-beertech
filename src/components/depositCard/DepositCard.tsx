import React, { useState, ChangeEvent, useRef } from "react";
import {
  Grid,
  Box,
  Typography,
  Button,
  CircularProgress,
} from "@material-ui/core";
import clsx from "clsx";
import useFetch from "../../helpers/Hooks/useFetch";
import { GET_EXTRATO, GET_SALDO, POST_OPERACAO } from "../../APIs/APIConta";
import wallet from "../../assets/wallet.svg";
import AlertDialog from "../dialog";
import composeRefs from "../../helpers/composeRefs";
import { ETypeOperation } from "../../Interfaces/IOperation";
import { useDispatch, useSelector } from "react-redux";
import UserAction from "../../store/actions/UserActions";
import { ExtratoConta } from "../../store/reducers/userReducers";
import CurrencyTextField from "@unicef/material-ui-currency-textfield";
import TransitionsModal from "../modal";
import cheers from "../../assets/hacker.svg";
import sad from "../../assets/sad.svg";
import useStyles from "./DepositCard.style";


const Deposit = () => {
  enum messageCode {
    SUCCESS = "success",
    ERROR = "error",
    NOMONEY = "nomoney",
  }
  const classes = useStyles();
  const container = useRef();

  const [errorDeposit, setErrorDeposit] = useState("");
  const [openModal, setModal] = useState(false);
  const [statusCode, setStatusCode] = useState(messageCode.ERROR);
  const [valueMoney, setCurrency] = useState(0);

  const dispatch = useDispatch();
  const { loading, request } = useFetch();

  const { userReducers }: any = useSelector((state) => state);
  const { localStorageReducers }: any = useSelector((state) => state);
  const { yoToken, yoUuid } = localStorageReducers;
  const { saldo } = userReducers;

  const isEmptyFields = () => {
    if (valueMoney > 0) {
      return false;
    }
    return true;
  };

  const getMessage = (status: messageCode) => {
    const options = {
      success: "Com sucesso transferido foi!",
      error: "Com erro, o fracasso é.",
      nomoney: "Dinheiro suficiente deve você ter!!!",
    };

    return options[status];
  };

  const handleDialog = async (param: string) => {
    if (param === "Sim") {
      if (saldo < valueMoney) {
        setModal(true);
        setStatusCode(messageCode.NOMONEY);
      }

      if (!isEmptyFields()) {
        handleSubmit();
      }
    } else {
      setModal(false);
    }
  };

  const handleSubmit = async () => {
    console.log("TESTE");
    if (loading) return null;
    if (valueMoney <= 0) {
      setErrorDeposit("Informe um valor de depósito");
      setTimeout(() => {
        setErrorDeposit("");
      }, 3000);
      return;
    }

    const { url, options } = POST_OPERACAO(
      {
        conta: localStorageReducers.yoUuid,
        tipo: ETypeOperation.DEPOSITO,
        valor: valueMoney,
      },
      localStorageReducers.yoToken
    );

    //TODO: TORNAR A FUNÇÃO  GET_SALDO GLOBAL
    //TODO: VERIFICAR VALIDAÇÕES
    const { response, json } = await request(url, options);
    if (response?.ok) {
      const { url, options } = GET_SALDO(yoUuid, yoToken);
      const { response, json } = await request(url, options);
      if (response?.ok) {
        setCurrency(0);
        dispatch({
          type: UserAction.SET_SALDO,
          payload: {
            saldo: json.saldo,
          },
        });
        getExtrato();
      } else {
        //TODO: REVER MENSSAGEM
        setErrorDeposit("Houve um erro, tente mais tarde!");
      }
    }
  };

  //TODO: TORNAR A FUNÇÃO  GET_SALDO GLOBAL
  const getExtrato = async () => {
    if (!yoUuid) return null;

    const startDate = new Date();
    let endDate = new Date();
    endDate.setDate(endDate.getDate() - 15);

    const { url, options } = GET_EXTRATO(
      yoUuid,
      yoToken,
      startDate.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0]
    );
    const { response, json } = await request(url, options);
    if (response?.ok) {
      dispatch({
        type: UserAction.SET_EXTRATO,
        payload: {
          extrato: json.content.map((extrato: ExtratoConta) => extrato),
        },
      });
    }
  };

  return (
    <Grid
      md={5}
      sm={5}
      xs={12}
      className={clsx([classes.marginBottom, classes.transferGrid])}
    >
      <Box className={classes.box}>
        <img className={classes.image} alt="transfer" src={wallet} />
        <Typography component="h3" variant="h5">
          Depósito
        </Typography>
      </Box>
      <form onSubmit={handleSubmit} id="depositForm">
        <CurrencyTextField
          variant="standard"
          value={valueMoney}
          label="R$"
          currencySymbol=""
          outputFormat="number"
          text
          required
          decimalCharacter=","
          digitGroupSeparator="."
          textAlign="left"
          className={clsx([classes.inputMargin, classes.inputWidth])}
          onChange={(
            event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
            value: number
          ) => setCurrency(value)}
        />
        <AlertDialog
          title="Depósito"
          titleId="deposit-op"
          content="O depósito você confirma?"
          contentId="deposit-cont"
          ButtonTextFirst="Não"
          ButtonTextSecond="Sim"
          handleAgree={handleDialog}
        >
          {({ isOpen, triggerRef, toggle }) => (
            <>
              <Button
                className={classes.button}
                ref={composeRefs(triggerRef, container)}
                onClick={toggle}
                disabled={isEmptyFields()}
              >
                {isOpen ? (
                  <CircularProgress size={24} color="secondary" />
                ) : (
                  "Depósitar"
                )}
              </Button>
            </>
          )}
        </AlertDialog>
      </form>

      {openModal && (
        <TransitionsModal title={getMessage(statusCode)}>
          <img
            className={classes.cheers}
            src={statusCode === messageCode.SUCCESS ? cheers : sad}
          />
        </TransitionsModal>
      )}
    </Grid>
  );
};

export default Deposit;
