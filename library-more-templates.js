(() => {
  if (window.__figureLoomMoreTemplates) return;
  window.__figureLoomMoreTemplates = true;

  const EXTRA_TEMPLATES = [
    {
      id:'pcr-workflow',
      name:'PCR workflow',
      description:'Sample, amplification, detection, and result.',
      objects:[
        {type:'text',name:'Title',x:380,y:55,width:440,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'PCR workflow'},
        {type:'science',asset:'tube',name:'Sample tube',x:85,y:270,width:155,height:105,fill:'#8ea0ff',stroke:'#26324a',opacity:1},
        {type:'text',name:'Sample label',x:90,y:405,width:150,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'Sample'},
        {type:'arrow',name:'Step',x:255,y:300,width:105,height:50,fill:'#5772c6',stroke:'#26324a',opacity:1},
        {type:'science',asset:'pipette',name:'Reaction setup',x:375,y:260,width:170,height:115,fill:'#8fd2c3',stroke:'#285b52',opacity:1},
        {type:'text',name:'Setup label',x:375,y:405,width:180,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'Reaction setup'},
        {type:'arrow',name:'Step',x:560,y:300,width:105,height:50,fill:'#5772c6',stroke:'#26324a',opacity:1},
        {type:'science',asset:'dna',name:'Amplification',x:675,y:250,width:185,height:130,fill:'#bd91ef',stroke:'#50316f',opacity:1},
        {type:'text',name:'Amplification label',x:675,y:405,width:190,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'Amplification'},
        {type:'arrow',name:'Step',x:875,y:300,width:105,height:50,fill:'#5772c6',stroke:'#26324a',opacity:1},
        {type:'shape',name:'Result panel',x:995,y:235,width:150,height:165,fill:'#ecfbf4',stroke:'#4e9270',opacity:1},
        {type:'text',name:'Result label',x:1015,y:285,width:110,height:55,fill:'#315e48',stroke:'#26324a',opacity:1,text:'Result'}
      ]
    },
    {
      id:'microscopy-panels',
      name:'Microscopy panels',
      description:'Four image panels with labels and a shared caption.',
      objects:[
        {type:'text',name:'Title',x:360,y:35,width:480,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'Microscopy figure'},
        {type:'shape',name:'Panel A',x:75,y:115,width:500,height:230,fill:'#f8fafc',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Panel B',x:625,y:115,width:500,height:230,fill:'#f8fafc',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Panel C',x:75,y:390,width:500,height:230,fill:'#f8fafc',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Panel D',x:625,y:390,width:500,height:230,fill:'#f8fafc',stroke:'#7a8494',opacity:1},
        {type:'text',name:'Label A',x:92,y:125,width:45,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'A'},
        {type:'text',name:'Label B',x:642,y:125,width:45,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'B'},
        {type:'text',name:'Label C',x:92,y:400,width:45,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'C'},
        {type:'text',name:'Label D',x:642,y:400,width:45,height:45,fill:'#172033',stroke:'#26324a',opacity:1,text:'D'},
        {type:'text',name:'Caption',x:260,y:660,width:680,height:45,fill:'#4b5563',stroke:'#26324a',opacity:1,text:'Condition, channel, magnification, and scale information'}
      ]
    },
    {
      id:'study-design',
      name:'Study design timeline',
      description:'Four-stage study flow from cohort to analysis.',
      objects:[
        {type:'text',name:'Title',x:375,y:70,width:450,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'Study design'},
        {type:'shape',name:'Cohort',x:70,y:250,width:220,height:190,fill:'#eef4ff',stroke:'#5f78b8',opacity:1},
        {type:'text',name:'Cohort label',x:105,y:315,width:150,height:55,fill:'#32405d',stroke:'#26324a',opacity:1,text:'Cohort'},
        {type:'arrow',name:'Step',x:305,y:320,width:95,height:50,fill:'#536fc2',stroke:'#26324a',opacity:1},
        {type:'shape',name:'Sampling',x:415,y:250,width:220,height:190,fill:'#ecfbf4',stroke:'#4e9270',opacity:1},
        {type:'text',name:'Sampling label',x:445,y:315,width:160,height:55,fill:'#315e48',stroke:'#26324a',opacity:1,text:'Sampling'},
        {type:'arrow',name:'Step',x:650,y:320,width:95,height:50,fill:'#536fc2',stroke:'#26324a',opacity:1},
        {type:'shape',name:'Assay',x:760,y:250,width:170,height:190,fill:'#f4efff',stroke:'#7c5fb8',opacity:1},
        {type:'text',name:'Assay label',x:795,y:315,width:100,height:55,fill:'#473761',stroke:'#26324a',opacity:1,text:'Assay'},
        {type:'arrow',name:'Step',x:945,y:320,width:95,height:50,fill:'#536fc2',stroke:'#26324a',opacity:1},
        {type:'shape',name:'Analysis',x:1050,y:250,width:120,height:190,fill:'#fff7e8',stroke:'#b47a24',opacity:1},
        {type:'text',name:'Analysis label',x:1058,y:315,width:105,height:55,fill:'#6f4c18',stroke:'#26324a',opacity:1,text:'Analysis'}
      ]
    },
    {
      id:'comparison-layout',
      name:'Side-by-side comparison',
      description:'Two conditions with a central conclusion.',
      objects:[
        {type:'text',name:'Title',x:360,y:55,width:480,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'Condition comparison'},
        {type:'shape',name:'Condition A panel',x:80,y:145,width:430,height:430,fill:'#eef4ff',stroke:'#5f78b8',opacity:1},
        {type:'shape',name:'Condition B panel',x:690,y:145,width:430,height:430,fill:'#ecfbf4',stroke:'#4e9270',opacity:1},
        {type:'text',name:'Condition A',x:215,y:175,width:160,height:55,fill:'#32405d',stroke:'#26324a',opacity:1,text:'Condition A'},
        {type:'text',name:'Condition B',x:825,y:175,width:160,height:55,fill:'#315e48',stroke:'#26324a',opacity:1,text:'Condition B'},
        {type:'arrow',name:'Comparison arrow',x:530,y:325,width:140,height:50,fill:'#7557c8',stroke:'#26324a',opacity:1},
        {type:'shape',name:'Conclusion',x:385,y:610,width:430,height:80,fill:'#f4efff',stroke:'#7c5fb8',opacity:1},
        {type:'text',name:'Conclusion label',x:485,y:625,width:230,height:45,fill:'#473761',stroke:'#26324a',opacity:1,text:'Main conclusion'}
      ]
    },
    {
      id:'results-dashboard',
      name:'Results dashboard',
      description:'Six compact result panels with a summary strip.',
      objects:[
        {type:'text',name:'Title',x:390,y:35,width:420,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'Results overview'},
        {type:'shape',name:'Result 1',x:65,y:110,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Result 2',x:432,y:110,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Result 3',x:799,y:110,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Result 4',x:65,y:335,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Result 5',x:432,y:335,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'shape',name:'Result 6',x:799,y:335,width:335,height:190,fill:'#ffffff',stroke:'#7a8494',opacity:1},
        {type:'text',name:'Label 1',x:82,y:125,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 1'},
        {type:'text',name:'Label 2',x:449,y:125,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 2'},
        {type:'text',name:'Label 3',x:816,y:125,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 3'},
        {type:'text',name:'Label 4',x:82,y:350,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 4'},
        {type:'text',name:'Label 5',x:449,y:350,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 5'},
        {type:'text',name:'Label 6',x:816,y:350,width:110,height:40,fill:'#172033',stroke:'#26324a',opacity:1,text:'Result 6'},
        {type:'shape',name:'Summary strip',x:185,y:575,width:830,height:95,fill:'#eef4ff',stroke:'#5f78b8',opacity:1},
        {type:'text',name:'Summary',x:410,y:598,width:380,height:50,fill:'#32405d',stroke:'#26324a',opacity:1,text:'Key result and interpretation'}
      ]
    },
    {
      id:'vertical-pathway',
      name:'Vertical molecular pathway',
      description:'Top-to-bottom receptor, mediator, gene, and response.',
      objects:[
        {type:'text',name:'Title',x:375,y:35,width:450,height:55,fill:'#172033',stroke:'#26324a',opacity:1,text:'Molecular signaling pathway'},
        {type:'science',asset:'membrane',name:'Membrane',x:250,y:115,width:700,height:85,fill:'#8ea0ff',stroke:'#31406a',opacity:1},
        {type:'science',asset:'protein',name:'Receptor',x:515,y:180,width:170,height:110,fill:'#ee8d9f',stroke:'#752e42',opacity:1},
        {type:'arrow',name:'Activation',x:555,y:300,width:90,height:70,fill:'#536fc2',stroke:'#26324a',opacity:1},
        {type:'science',asset:'protein',name:'Mediator',x:515,y:380,width:170,height:110,fill:'#8fd2c3',stroke:'#285b52',opacity:1},
        {type:'arrow',name:'Activation',x:555,y:500,width:90,height:70,fill:'#536fc2',stroke:'#26324a',opacity:1},
        {type:'science',asset:'dna',name:'Gene expression',x:490,y:580,width:220,height:125,fill:'#bd91ef',stroke:'#50316f',opacity:1},
        {type:'text',name:'Response',x:790,y:605,width:260,height:55,fill:'#315e48',stroke:'#26324a',opacity:1,text:'Cellular response'}
      ]
    }
  ];

  function addCards() {
    const drawer = document.getElementById('templateDrawer');
    const body = drawer?.querySelector('.utility-body');
    if (!body || typeof applyTemplate !== 'function') return false;
    if (body.querySelector('[data-extra-template-library]')) return true;

    const heading = document.createElement('div');
    heading.dataset.extraTemplateLibrary = '1';
    heading.className = 'extra-template-heading';
    heading.innerHTML = '<strong>More layouts</strong><span>Additional editable structures</span>';
    body.appendChild(heading);

    EXTRA_TEMPLATES.forEach((template, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'template-card';
      card.dataset.extraTemplate = template.id;
      card.innerHTML = `<span class="template-thumb">+${index + 1}</span><span class="template-copy"><strong>${template.name}</strong><span>${template.description}</span></span>`;
      card.addEventListener('click', () => applyTemplate(template));
      body.appendChild(card);
    });

    const style = document.createElement('style');
    style.textContent = `
      .extra-template-heading{display:flex;justify-content:space-between;align-items:end;margin:15px 0 8px;padding-top:12px;border-top:1px solid #e1e6ee}
      .extra-template-heading strong,.extra-template-heading span{display:block}
      .extra-template-heading strong{font-size:12px;color:#334155}
      .extra-template-heading span{font-size:9px;color:#788397}
    `;
    document.head.appendChild(style);
    return true;
  }

  if (!addCards()) {
    const observer = new MutationObserver(() => {
      if (addCards()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 8000);
  }
})();