#!/usr/bin/env node
'use strict';

// Modulos Externos
const _         = require('lodash');
const colors    = require('colors');
const inquirer  = require('inquirer');
const moment    = require('moment');
const SimpleGit = require('simple-git');

// Modulos Internos
const api = require('./API')('repos/mercadolibre/fury_kplfront');

// Firulas
const Spinner = require('cli-spinner').Spinner;
const spinner = new Spinner('%s');
spinner.setSpinnerString("⣾⣽⣻⢿⡿⣟⣯⣷");

//GLOBALS
var approveds, selecteds, branch,
    git = SimpleGit( process.pwd );
    // git = SimpleGit( '/Users/gfelizola/Dev/kpl-express-react' );

const onError = err => {
    console.error(err);
    spinner.stop(true);
}

const getPRs = function(){
    spinner.setSpinnerTitle('Carregando Pull Requests');
    spinner.start();

    api('pulls')
        .get()
        .catch( onError )
        .then( data => {
            spinner.stop(true);

            getReviews( data );
        });
}

const getReviews = function( prs ) {
    spinner.setSpinnerTitle('Carregando Reviews dos Pull Requests');
    spinner.start();

    let reviews = prs.map( repo => api(`pulls/${repo.number}/reviews`)
        .get()
        .then( reviews => {
            repo.reviews = reviews;
            return repo;
        })
        .catch(()=> {}) //ignore on error
    );

    Promise.all( reviews ).then( result => {
        spinner.stop(true);

        getApprovedPRs( result );
    });
}

const getApprovedPRs = function ( prs ) {

    approveds = [];

    prs.forEach( pr => {
        let isApproved  = false;
        let { reviews } = pr;
        let group       = _.groupBy( reviews, 'commit_id' );
        let lastCommit  = _.last( Object.keys( group ) );
        let lastReviews = group[ lastCommit ];

        if( lastReviews ) {
                lastReviews.forEach( review => {
                if( review.state === 'APPROVED' ) isApproved = true;
            });
        }

        if ( isApproved ) approveds.push( pr );
    });

    getUserOptions( approveds )
}

const getUserOptions = function( approvedsPRs ){

    inquirer.prompt([{
        type     : 'input',
        name     : 'branch',
        message  : 'Qual será o nome do branch gerado',
        default  : function () {
            return 'prs-release-' + moment().format( 'YYYYMMDD' );
        }
    },{
        type     : 'input',
        name     : 'branchFrom',
        message  : 'Essa branch será gerada a partir de qual?',
        default  : function () {
            return 'master';
        }
    },{
        type     : 'checkbox',
        message  : 'Selecione os PRs para criar o pacote',
        name     : 'prs',
        choices  : approvedsPRs.map( pr => `${pr.number} - ${pr.title}` ),
        validate : function (answer) {
            if ( answer.length < 1 ) {
                return 'Você precisa escolher no mínimo um Pull Request';
            }
            return true;
        }
    }
    ]).then(answers => {
        let { prs, branchFrom } = answers;
        branch      = answers.branch;
        selecteds   = getPRsFromSelection( prs, approvedsPRs );

        createBranch( branchFrom );
    });
}

const getPRsFromSelection = function( selection, approveds ){
    let selectedPRs = [];
    selection.forEach( prSelected => {
        let [ prNumber ] = prSelected.split(' - ');

        let pr = approveds.find( apr => apr.number == prNumber );
        selectedPRs.push( pr );
    });

    return selectedPRs;
}

const createBranch = function( branchFrom ) {
    console.log(`Inicializando comandos git`.cyan);

    spinner.setSpinnerTitle(`git checkout ${branchFrom}`);
    spinner.start();

    git.checkout(branchFrom, () => {
        spinner.setSpinnerTitle(`git pull origin ${branchFrom}`);

        git.pull( ( err, update ) => {
            spinner.setSpinnerTitle(`git checkout -b ${branch}`);

            git.checkoutLocalBranch( branch, (err, result) => {
                spinner.stop(true);

                if ( err ) {
                    console.log('Erro ao criar a branch'.red );
                    console.log( branch );
                    console.log( err );
                } else {
                    initMerges();
                }

            })
        });

    });
}

const initMerges = function() {
    console.log(`Inicializando merge dos Pull Requests na branch ${branch}`.cyan);

    mergeSelectedPRs( selecteds.length, 0 );
}

const mergeSelectedPRs = function( total, currentIndex ) {
    if ( currentIndex >= total ) {

        spinner.setSpinnerTitle(`Enviando branch para remote (git push origin ${branch})`);
        spinner.start();

        git.push('origin', branch, () => {
            spinner.stop(true);
            console.log('----------------'.green);
            console.log('Pacote criado com sucesso'.green);
            console.log('Branch:'.green, branch.white);
            console.log('----------------'.green);
        })

    } else {
        let pr = selecteds[currentIndex];
        mergePR( pr ).then( result => {
            console.log('Resultado do merge', result);
            mergeSelectedPRs( total, ++currentIndex );
        }).catch( err => {
            console.log('Erro no merge'.red);
            console.log('PR: '.grey, `${ pr.number } - ${ pr.title }`.yellow );
            console.error(err);

            handleMergeError();
        })
    }
}

const mergePR = function(pr) {
    spinner.setSpinnerTitle(`git merge origin/${ pr.head.ref }`);
    spinner.start();

    return new Promise( ( resolve, reject ) => {
        git.mergeFromTo( `origin/${ pr.head.ref }`, branch, ( err, result ) => {
            spinner.stop(true);

            if ( ! _.isNil( err ) ) {
                reject(err);
            } else {
                if ( result.indexOf( 'CONFLICT' ) >= 0 ) {
                    reject( new Error('PR with conflict') );
                } else {
                    resolve( result );
                }
            }
        })
    });
}

const handleMergeError = function() {
    spinner.setSpinnerTitle(`Desfazendo comandos git (reset, delete branch)`);
    spinner.start();

    git.reset('hard', () => {
        git.checkout('master', () => {
            git.deleteLocalBranch(branch, () => {
                spinner.stop();
                console.log('');
            })
        })
    })
}

getPRs();